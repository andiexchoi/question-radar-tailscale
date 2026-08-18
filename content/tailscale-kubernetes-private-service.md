---
title: Expose a private Kubernetes service to your tailnet—without a public load balancer
description: A practical Tailscale Kubernetes Operator tutorial for giving engineers private, identity-aware access to an internal HTTP service.
intent: Adopt
cluster: Tailscale with Kubernetes
validation: Documentation-validated; commands not executed against a live Kubernetes cluster
---

# Expose a private Kubernetes service to your tailnet—without a public load balancer

> **Validation status:** This is a documentation-validated technical sample. The commands have not been executed against a live Kubernetes cluster.

Your internal dashboard does not need a public IP, a public DNS record, or an internet-facing load balancer just because engineers need to reach it from home.

The Tailscale Kubernetes Operator can give a Kubernetes `Service` a private tailnet address. The operator runs the ingress proxy in your cluster; authenticated tailnet devices reach it over Tailscale; the proxy forwards traffic to the normal cluster service. The workload remains absent from the public internet.

This tutorial starts with the smallest working design, then shows the production upgrade.

## What you will build

```text
engineer laptop
      │  encrypted tailnet connection
      ▼
Tailscale ingress proxy in Kubernetes
      │  cluster networking
      ▼
internal-dashboard Service → application Pods
```

Use this pattern for internal dashboards, staging tools, admin panels, APIs, and other services that should be reachable by a defined group of people or devices—but not by the whole internet.

## Before you begin

You need:

- a Kubernetes cluster and a working `kubectl` context;
- Helm;
- permission to edit Tailscale access controls and create OAuth credentials; and
- a service already reachable from inside the cluster.

The operator uses an OAuth client to create and manage tailnet devices. Do not put the client secret in Git. For production, inject it from your secret manager or use workload identity federation.

## 1. Give the operator a constrained identity

Add an operator tag and a child tag to your tailnet policy:

```json
{
  "tagOwners": {
    "tag:k8s-operator": [],
    "tag:k8s": ["tag:k8s-operator"]
  }
}
```

Create a Tailscale OAuth client tagged `tag:k8s-operator`. Grant write scope only for Services, Devices, and Auth Keys. Save the client ID and secret somewhere secure.

Why two tags? The operator authenticates as `tag:k8s-operator`; the proxy devices it creates use `tag:k8s`. That separation lets you write access rules for workloads without treating the operator itself as an application endpoint.

## 2. Install the operator

```bash
helm repo add tailscale https://pkgs.tailscale.com/helmcharts
helm repo update

helm upgrade \
  --install \
  tailscale-operator \
  tailscale/tailscale-operator \
  --namespace=tailscale \
  --create-namespace \
  --set-string oauth.clientId="$TS_OAUTH_CLIENT_ID" \
  --set-string oauth.clientSecret="$TS_OAUTH_CLIENT_SECRET" \
  --wait
```

Confirm that the deployment is ready:

```bash
kubectl -n tailscale get deployment tailscale-operator
kubectl -n tailscale logs deployment/tailscale-operator --tail=50
```

You should also see a `tailscale-operator` machine, tagged `tag:k8s-operator`, in the Tailscale admin console.

## 3. Expose one service privately

Assume an existing deployment uses the label `app: internal-dashboard` and listens on port `8080`. Create a regular `Service`, add the Tailscale expose annotation, and choose a stable MagicDNS hostname:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-dashboard
  namespace: platform-tools
  annotations:
    tailscale.com/expose: "true"
    tailscale.com/hostname: "platform-dashboard"
spec:
  selector:
    app: internal-dashboard
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

Apply it:

```bash
kubectl apply -f internal-dashboard-service.yaml
kubectl -n platform-tools get service internal-dashboard --watch
```

The operator creates a proxy Pod and registers it in the tailnet. When the external address appears, test from a device connected to Tailscale:

```bash
curl -I http://platform-dashboard
```

If you prefer the `LoadBalancer` form, set `spec.type: LoadBalancer` and `spec.loadBalancerClass: tailscale`. Both patterns tell the operator to expose the service to the tailnet, not the public internet.

## 4. Restrict who can reach it

Private is not the same as authorized. Add a Tailscale grant that limits access to the people who need the tool. This example assumes a group called `group:platform` and the default `tag:k8s` tag:

```json
{
  "grants": [
    {
      "src": ["group:platform"],
      "dst": ["tag:k8s"],
      "ip": ["tcp:80"]
    }
  ]
}
```

Treat this as a starting point, not a paste-ready replacement for your full policy. Merge it with existing grants, use narrower workload tags when different services need different audiences, and validate the policy before saving.

Now test both sides:

1. A member of `group:platform` should reach the service.
2. A tailnet member outside the group should not.
3. A device disconnected from Tailscale should not resolve or reach the service.

That negative test is important. “It works for me” only proves routing; it does not prove the boundary.

## 5. Upgrade the ingress path for production

The one-annotation pattern creates a standalone proxy. That is ideal for a first service or a low-risk internal tool. For a production service, use a `ProxyGroup` with multiple replicas so a proxy restart does not remove the only ingress path.

```yaml
apiVersion: tailscale.com/v1alpha1
kind: ProxyGroup
metadata:
  name: private-ingress
spec:
  type: ingress
  replicas: 2
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internal-dashboard
  namespace: platform-tools
  annotations:
    tailscale.com/proxy-group: private-ingress
spec:
  ingressClassName: tailscale
  tls:
    - hosts:
        - platform-dashboard
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: internal-dashboard
                port:
                  number: 80
```

This produces a private HTTPS endpoint on the tailnet and spreads ingress across the proxy group. A shared proxy group is also more efficient when many services need private ingress.

## Troubleshooting by layer

Work from the application outward instead of changing several systems at once.

| Symptom | Check first | Likely layer |
| --- | --- | --- |
| Service has no endpoints | `kubectl get endpointslice -n platform-tools -l kubernetes.io/service-name=internal-dashboard` | Selector or Pod readiness |
| No Tailscale address appears | Operator logs and OAuth scopes | Operator control plane |
| Name resolves but connection times out | Tailnet grants and Kubernetes `NetworkPolicy` | Authorization or cluster policy |
| One user connects and another cannot | Group membership and workload tags | Tailnet policy |
| Works until the proxy restarts | Move from standalone ingress to a multi-replica `ProxyGroup` | Availability design |
| HTTP works but HTTPS does not | Tailnet HTTPS setting and `tls.hosts` value | Certificate or ingress config |

Also check for a common conceptual mistake: a subnet router and an ingress proxy solve different problems. A subnet router advertises whole private CIDRs. Ingress exposes a specific Kubernetes service. Prefer the narrow service-level path when you do not need general access to the cluster network.

## The production checklist

Before calling this done:

- use workload-specific tags instead of granting broad access to every `tag:k8s` device;
- manage OAuth credentials outside Git, or use workload identity federation;
- use a multi-replica `ProxyGroup` for services with an uptime requirement;
- keep Kubernetes `NetworkPolicy` in place—the tailnet is an access path, not a reason to flatten cluster controls;
- test a denied identity and a non-tailnet device;
- monitor operator and proxy Pods; and
- document who owns the access rule and how access is revoked.

The important architectural change is small: the service becomes reachable because the caller has a trusted tailnet identity, not because the application was given a public edge.

## Sources

- [Install the Tailscale Kubernetes Operator](https://tailscale.com/docs/kubernetes-operator/install-operator)
- [Expose cluster workloads to your tailnet with Ingress](https://tailscale.com/docs/kubernetes-operator/ingress)
- [Expose a workload to your tailnet at layer 7](https://tailscale.com/docs/kubernetes-operator/ingress/expose-workload-to-tailnet-l7)
- [Subnet routers](https://tailscale.com/docs/features/subnet-routers)
