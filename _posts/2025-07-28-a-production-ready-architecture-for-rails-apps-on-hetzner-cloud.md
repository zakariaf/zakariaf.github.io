---
title: "A Production-Ready, Secure, and Scalable Architecture for Ruby on Rails on Hetzner Cloud"
author: zakaria
date: 2025-06-04 22:18:00 +0100
categories: [Infrastructure, Rails]
tags: [rails, hetzner, kamal, postgresql, docker, devops, production, security, cloudflare, load-balancer]
media_subpath: /assets/img/posts/2025-07-28-a-production-ready-architecture-for-rails-apps-on-hetzner-cloud
image: cover.png
mermaid: true
---

## The Big Picture: What We're Building

Before diving into the step-by-step implementation, let's understand the complete architecture we'll be creating. This is a fortress-like, security-first infrastructure that provides enterprise-grade capabilities at a fraction of traditional cloud costs.

```mermaid
graph TD
    subgraph "Public Zone"
        User["<br><b>User</b><br>"]
        Admin["<br><b>Developer / Admin</b><br>Kamal Deploy"]
        CF["<b>Cloudflare</b><br>DNS, SSL/TLS, Caching"]
    end
    subgraph "Hetzner Cloud"
        LB["<b>Hetzner Load Balancer</b><br>Public IP<br>Terminates SSL"]
        subgraph "Production Private Network"
            Bastion["<b>Bastion Host / NAT Gateway</b><br>Public IP (SSH Port 22 Only)<br>Private IP"]
            subgraph "Application"
                App1["<b>App Server 1</b><br>(Private IP)<br>Docker: Rails App"]
                App2["<b>App Server 2</b><br>(Private IP)<br>Docker: Rails App"]
            end
            subgraph "Background Jobs"
                Jobs["<b>Jobs Server</b><br>(Private IP)<br>Docker: Rails + Solid Queue"]
            end
            subgraph "Database Cluster"
                DB_Primary["<b>PostgreSQL Primary</b><br>(Private IP)<br>Hetzner Volume"]
                DB_Replica["<b>PostgreSQL Replica</b><br>(Private IP)<br>Hetzner Volume"]
            end
            subgraph "Monitoring"
                Monitor["<b>Monitoring Server</b><br>(Private IP)<br>Prometheus + Grafana"]
            end
        end
        subgraph "External Hetzner Services"
            Storage["<b>Hetzner Object Storage</b><br>(S3 Compatible)"]
        end
    end
    %% Connections
    User -- "HTTPS (Port 443)" --> CF
    CF -- "HTTPS (Port 443)" --> LB
    Admin -- "SSH (Port 22)" --> Bastion
    LB -- "HTTP Traffic<br>(Private Network)" --> App1
    LB -- "HTTP Traffic<br>(Private Network)" --> App2
    LB -- "Health Check (/up)" --> App1
    LB -- "Health Check (/up)" --> App2
    Bastion -- "SSH via Proxy<br>(Kamal Deployment)" --> App1
    Bastion -- "SSH via Proxy<br>(Kamal Deployment)" --> App2
    Bastion -- "SSH via Proxy<br>(Kamal Deployment)" --> Jobs
    Bastion -- "SSH via Proxy<br>(Kamal Deployment)" --> DB_Primary
    Bastion -- "SSH via Proxy<br>(Kamal Deployment)" --> DB_Replica
    Bastion -- "SSH Access" --> Monitor
    App1 -- "PostgreSQL (Port 5432)" --> DB_Primary
    App2 -- "PostgreSQL (Port 5432)" --> DB_Primary
    Jobs -- "PostgreSQL (Port 5432)" --> DB_Primary
    DB_Primary -- "Streaming Replication" --> DB_Replica
    Monitor -- "Metrics Collection" --> App1
    Monitor -- "Metrics Collection" --> App2
    Monitor -- "Metrics Collection" --> Jobs
    Monitor -- "Metrics Collection" --> DB_Primary
    %% Outbound connections via NAT Gateway
    App1 -- "Outbound S3 API Call<br>(via NAT on Bastion)" --> Storage
    App2 -- "Outbound S3 API Call<br>(via NAT on Bastion)" --> Storage
    Jobs -- "Outbound S3 API Call<br>(via NAT on Bastion)" --> Storage
    %% Styling
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef public fill:#e6f7ff,stroke:#006080,stroke-width:2px;
    classDef private fill:#fff5e6,stroke:#8D6E63,stroke-width:2px;
    classDef db fill:#f0f4c3,stroke:#558B2F,stroke-width:2px;
    classDef storage fill:#e1e1e1,stroke:#555,stroke-width:2px;
    classDef monitor fill:#f3e5f5,stroke:#7B1FA2,stroke-width:2px;
    class User,Admin,CF public;
    class Bastion,LB,App1,App2,Jobs private;
    class DB_Primary,DB_Replica db;
    class Storage storage;
    class Monitor monitor;
```

### Architecture Overview

This infrastructure creates a **security-first, highly available Rails application** with the following key characteristics:

#### 🔒 **Security Layers**

- **Private Network Isolation**: All application servers live in a private network with zero public internet access
- **Single Entry Point**: Only the bastion host has SSH access (port 22) from the outside world
- **Zero-Trust Internal Network**: Each server has granular firewall rules allowing only necessary connections
- **End-to-End Encryption**: CloudFlare → Hetzner LB → App Servers all use SSL/TLS

#### 🚀 **High Availability**

- **Load-Balanced Applications**: Two Rails app servers behind a Hetzner Load Balancer
- **Database Replication**: PostgreSQL primary with streaming replica for failover
- **Solid Queue Jobs**: Dedicated server for background job processing using Rails' built-in solution
- **Health Monitoring**: Automatic health checks remove failed servers from rotation
- **Persistent Storage**: Database files stored on Hetzner Volumes (network-attached storage)

#### 📊 **Modern Rails Stack**

- **Solid Queue**: Rails 8's built-in job queue (replaces Sidekiq/Redis)
- **Solid Cache**: Database-backed caching solution
- **Solid Cable**: Database-backed Action Cable for WebSockets
- **No External Dependencies**: Everything runs on PostgreSQL, reducing complexity

#### 📈 **Observability**

- **Dedicated Monitoring**: Prometheus + Grafana on separate server
- **Application Metrics**: Rails performance and business metrics
- **Infrastructure Metrics**: Server health, database performance
- **Centralized Logging**: Log aggregation across all services

#### 💰 **Cost Efficiency**

- **Total Monthly Cost**: ~€180 for complete production setup with monitoring
- **Staging Environment**: Single €6.80 server for development/testing
- **No External Services**: Solid Queue eliminates Redis costs and complexity
- **Hetzner Pricing**: 50-70% cheaper than AWS/GCP for equivalent resources

### Key Components Explained

| Component | Purpose | Access | Monthly Cost |
|-----------|---------|---------|--------------|
| **CloudFlare** | DNS, SSL termination, DDoS protection, CDN | Public | Free |
| **Hetzner Load Balancer** | Distributes traffic, SSL termination, health checks | Public IP | €5.39 |
| **Bastion/NAT Gateway** | Single SSH entry point, internet gateway for private servers | Public + Private IP | €3.92 |
| **App Servers (2x)** | Rails application containers with Solid Cache/Cable | Private IP only | €23.98 |
| **Jobs Server** | Background job processing with Solid Queue | Private IP only | €11.99 |
| **PostgreSQL Primary** | Main database with persistent storage | Private IP only | €11.99 |
| **PostgreSQL Replica** | Read replica for failover and read scaling | Private IP only | €11.99 |
| **Monitoring Server** | Prometheus + Grafana for observability | Private IP only | €5.99 |
| **Hetzner Object Storage** | File uploads, backups (S3-compatible) | API access via NAT | ~€2/month |

### Traffic Flow

1. **User Request**: User → CloudFlare → Hetzner Load Balancer → App Server
2. **Admin Access**: Developer → Bastion (SSH) → Private Servers (via ProxyJump)
3. **Database Access**: App Servers → PostgreSQL Primary → Replica (replication)
4. **Background Jobs**: Jobs Server → PostgreSQL (Solid Queue tables)
5. **File Storage**: App Servers → Hetzner Object Storage (via NAT Gateway)
6. **Monitoring**: Prometheus → All servers → Grafana dashboards

### Security Zones

- **🌐 Public Zone**: CloudFlare, Load Balancer (public access)
- **🔐 DMZ**: Bastion Host (controlled SSH access)
- **🏰 Private Zone**: All application and database servers (no public access)
- **📊 Monitoring Zone**: Observability stack (private access)
- **📦 Storage Zone**: Object storage (API access only)

---

## Ready to Build?

This architecture provides enterprise-grade security, availability, and performance while maintaining operational simplicity and cost efficiency. The complete setup takes about 3-4 hours following this guide.

**What you'll need:**

- Hetzner Cloud account
- Domain name (for CloudFlare)
- Local machine with SSH and Docker
- Basic understanding of Rails deployment

**Let's get started with the step-by-step implementation guide below!**

---

## Implementation Guide: Building Component by Component

We'll build this infrastructure step by step, following the logical order of dependencies. Each section explains **why** we need the component and **how** to implement it.

---

# Step 1: Production Private Network

## Why We Need a Private Network

Before creating any servers, we need to establish the network foundation. A private network provides:

- **Security Isolation**: Servers can communicate privately without internet exposure
- **Performance**: Internal traffic doesn't go through public internet
- **Cost Efficiency**: No bandwidth charges for internal communication
- **Network Control**: We define IP ranges and routing rules

Think of this as creating the "internal wiring" of our data center before plugging in any devices.

## How to Create the Private Network

### Step 1.1: Creating the Hetzner Cloud Private Network

1. **Navigate to the Hetzner Cloud Console**: Log in to your Hetzner Cloud project.

2. **Create the Network**: In the left menu, select "Networks" and then click "Create network".

3. **Define Network Parameters**:
   - **Name**: `production-network`
   - **IP Range**: `10.0.0.0/16` (provides 65,534 available IP addresses for future expansion)

This creates the virtual network fabric that all our private servers will use to communicate securely.

![production-network](production-network.png){: .normal}

### Network IP Planning

We'll use this IP allocation strategy:

```
10.0.0.2   - Bastion/NAT Gateway
10.0.0.10  - App Server 1
10.0.0.11  - App Server 2
10.0.0.20  - PostgreSQL Primary
10.0.0.21  - PostgreSQL Replica
10.0.0.30  - Jobs Server (Solid Queue)
10.0.0.40  - Monitoring Server
```

# Step 2: Bastion Host / NAT Gateway

## Why We Need a Bastion Host

The bastion host is the **cornerstone of our security model**. It serves three critical functions:

1. **Single Entry Point**: Only one server has public SSH access, dramatically reducing attack surface
2. **Jump Host**: Provides secure access to all private servers via SSH tunneling
3. **NAT Gateway**: Allows private servers to access the internet for updates and dependencies

Without a bastion host, you'd either need:
- Public IPs on all servers (insecure and expensive)
- Complex VPN setup (operational overhead)
- No internet access for private servers (can't update packages)

The bastion is like having a **single, heavily guarded gate** to your digital fortress.

## How to Create and Configure the Bastion Host

### Step 2.1: Provisioning the Bastion Server

1. **Create the Server**: In the left menu, select "Servers" and then click "Add Server".
2. **Define Server Parameters**:
   - **Name**: `bastion-server`
   - **Server Type**: CX22 or CAX11 (sufficient for this role)
   - **Location**: Choose your preferred region (e.g., `Falkenstein`)
   - **Image**: Ubuntu 24.04
   - **Networking**:
     - ✅ **Assign public IPv4** (critical - this is our only public server)
     - ✅ **Attach to our Private Network: production-network**
   - **SSH Key**: Add your public SSH key

- a small server type is sufficient for this role. it's just for SSH access and NAT functionality
- You don't need to select Firewall, backups, volumes, and all other things in this step.


![bastion-server](bastion-server.png){: .normal}

### Step 2.2: Initial Server Hardening

Connect to your new bastion server and start securing it:

```bash
ssh root@YOUR_BASTION_PUBLIC_IP
```


Then we need to update the system packages first

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2.3: Create Non-Root User with Sudo Privileges

It's critical to disable direct root login and use a non-root user with sudo privileges

Follow these steps to create a non-root user:

```bash
# Create new user (replace 'deployer' with your preferred username)
adduser deployer
# It will prompt you to set a password and fill in user details

# Add user to sudo group
usermod -aG sudo deployer

# Create SSH directory for new user
mkdir -p /home/deployer/.ssh

# Copy authorized keys from root
cp /root/.ssh/authorized_keys /home/deployer/.ssh/authorized_keys

# Set proper ownership and permissions
chown -R deployer:deployer /home/deployer/.ssh
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys
```

### Step 2.4: Configure SSH Security

Edit the SSH daemon configuration to enhance security:

```bash
sudo nano /etc/ssh/sshd_config
```

Make these critical changes:
- `PasswordAuthentication no` (disable password authentication)
- `PermitRootLogin no` (disable root login)

Restart SSH service:
```bash
sudo systemctl restart ssh
```

**Test your non-root access** before continuing! Open a new terminal and verify you can SSH as the deployer user:

```bash
ssh deployer@YOUR_BASTION_PUBLIC_IP
```


if you close your root terminal, and try to login with root user (`ssh root@YOUR_BASTION_PUBLIC_IP`), you will get an error like this:

```bash
Permission denied (publickey)
```
This is expected since we disabled root login.

From now we close the root terminal and continue with the `deployer` user.

### Step 2.5: Configure NAT Gateway Functionality

The bastion needs to act as a NAT gateway so private servers can access the internet:

```bash
# ------------------------------
# 1. Enable IP Forwarding
# ------------------------------

# Enable IP forwarding immediately (in-memory)
sudo sysctl -w net.ipv4.ip_forward=1

# Make IP forwarding persistent across reboots
# Remove existing entries to avoid duplicates
sudo sed -i '/^net.ipv4.ip_forward/d' /etc/sysctl.conf
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf

# ------------------------------
# 2. Set Up NAT (iptables)
# ------------------------------

# Configure iptables for Network Address Translation(NAT)
# This rule translates private IPs to the bastion's public IP
sudo iptables -t nat -A POSTROUTING -s '10.0.0.0/16' -o eth0 -j MASQUERADE


# ------------------------------
# 3. Save iptables Rules
# ------------------------------

# Install iptables-persistent to save rules permanently
sudo apt install iptables-persistent -y

# Save current iptables rules
sudo netfilter-persistent save
# Output:
# run-parts: executing /usr/share/netfilter-persistent/plugins.d/15-ip4tables save
# run-parts: executing /usr/share/netfilter-persistent/plugins.d/25-ip6tables save


# ------------------------------
# 4. (Optional) Verify Configuration
# ------------------------------

# Check that IP forwarding is enabled
sudo sysctl net.ipv4.ip_forward
# Output should be: net.ipv4.ip_forward = 1

# List NAT rules to confirm MASQUERADE is set
sudo iptables -t nat -L -n -v
# Output should show a rule like:
# Chain PREROUTING (policy ACCEPT 0 packets, 0 bytes)
#  pkts bytes target     prot opt in     out     source               destination

# Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
#  pkts bytes target     prot opt in     out     source               destination

# Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
#  pkts bytes target     prot opt in     out     source               destination

# Chain POSTROUTING (policy ACCEPT 2 packets, 162 bytes)
#  pkts bytes target     prot opt in     out     source               destination
#     0     0 MASQUERADE  0    --  *      eth0    10.0.0.0/16          0.0.0.0/0

# Show routing table
ip route
# Output should show:
# default via 172.31.1.1 dev eth0 proto dhcp src 128.140.86.71 metric 100
# 10.0.0.0/16 via 10.0.0.1 dev enp7s0 proto dhcp src 10.0.0.2 metric 1003 mtu 1450
# 10.0.0.1 dev enp7s0 proto dhcp scope link src 10.0.0.2 metric 1003 mtu 1450
# 172.31.1.1 dev eth0 proto dhcp scope link src 128.140.86.71 metric 100
# 185.12.64.1 via 172.31.1.1 dev eth0 proto dhcp src 128.140.86.71 metric 100
# 185.12.64.2 via 172.31.1.1 dev eth0 proto dhcp src 128.140.86.71 metric 100
```

### Step 2.6: Configure Hetzner Cloud Routing

Tell Hetzner Cloud to route internet traffic through our bastion:

1. **Navigate to Networks** in Hetzner Cloud Console
2. Select your **production-network**
3. Open the **Routes** tab and click **Add route**
4. Configure the route as follows:
   - **Destination**: `0.0.0.0/0` (all internet traffic)
   - **Gateway**: `10.0.0.2` (your bastion’s internal IP)

This ensures all internet-bound traffic from private servers is routed through the bastion, which handles NAT translation.

![hetzner-routing](hetzner-routing.png){: .normal}

For the NAT routing to work as intended, we must manually configure the default gateway inside each private VM (server) to point to the bastion’s IP, and the warning you see is about that, but we will do the configuration while creating the application servers in the next step.

# Step 3: Application Servers

## Why We Need Multiple Application Servers

Multiple application servers provide:

- **High Availability**: If one server fails, the other continues serving traffic
- **Load Distribution**: Requests are spread across multiple servers
- **Zero-Downtime Deployments**: Deploy to servers one at a time
- **Horizontal Scalability**: Easy to add more servers when traffic grows

This is the difference between a hobby project and a production system that can handle real user load.

## How to Create the Application Servers

### Step 3.1: Automated Server Configuration with Cloud-Init

When you create servers in Hetzner Cloud, there's an input field labeled "Cloud config". This lets us automatically configure the server on first boot.

We use this to automatically set networking settings, including:

- Routing all outbound traffic through the bastion server (NAT gateway)
- Defining custom DNS servers
- Ensuring that DHCP doesn’t override our gateway or DNS setup

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    enp7s0:
      dhcp4: true
      dhcp4-overrides:
        use-routes: false     # Prevent DHCP from setting default route
        use-dns: false        # Prevent DHCP from setting DNS servers
      gateway4: 10.0.0.2      # Bastion’s private IP (NAT gateway)
      nameservers:
        addresses:
          - 185.12.64.2
          - 185.12.64.1
          - 8.8.8.8
```

> 📌 **Note:** Replace `10.0.0.2` with the actual internal IP of your bastion server (the NAT gateway). All internet-bound traffic will be routed through it.

You don't need to do anything right now, just keep this somewhere. We will use it when creating the application servers.

### Step 3.2: Create Application Servers

Create two application servers for high availability:

In the left menu, select "Servers" and then click "Add Server".

**App Server 1:**
- **Name**: `app-01`
- **Location**: Same as your bastion region (e.g., `Falkenstein`)
- **Server Type**: CPX41 or CAX31 (8 vCPU, 16GB RAM) - I pick CAX31 as it's cheaper
- **Image**: Ubuntu 24.04
- **Networking**:
  - ❌ **No public IPv4** (private only)
  - ❌ **No public IPv6** (private only)
  - ✅ **Attach to production-network**
- **Tags** (optional but recommended):
  - role=app
  - env=production
- **Cloud Config**: Paste the cloud-init configuration we created above
- **SSH Key**: Add your SSH key

**App Server 2:**
- **Name**: `app-02`
- **Same configuration as App Server 1**

These servers will run your Rails application with Solid Cache and Solid Cable.

![server-app](server-app.png){: .normal}

# Step 4: Jobs Server

## Why We Need a Dedicated Jobs Server

Using a dedicated server for background jobs ensures:

- **Resource Isolation**: Background jobs don't compete with web requests for CPU/memory
- **Scaling Independence**: Scale job processing separately from web serving
- **Fault Isolation**: Job failures don't affect web server performance
- **Specialized Tuning**: You can optimize CPU, memory, and threads for job workloads

> 🚀 With Rails 8's Solid Queue, we get Redis-like capabilities without the operational complexity of managing Redis.

## How to Create the Jobs Server

### Step 4.1: Create Jobs Server

In the left menu, select "Servers" and then click "Add Server".

**Jobs Server:**

- **Name**: `jobs-01`
- **Server Type**: CX32 (4 vCPU, 8GB RAM)
- **Location**: Same as your bastion region (e.g., `Falkenstein`)
- **Image**: Ubuntu 24.04
- **Networking**:
  - ❌ **No public IPv4** (private only)
  - ❌ **No public IPv6** (private only)
  - ✅ **Attach to production-network**
- **Tags** (optional but recommended):
  - role=jobs
  - env=production
- **Cloud Config**: Paste the cloud-init configuration we created above
- **SSH Key**: Add your SSH key

This server will run Rails with Solid Queue for background job processing.


This is what we have so far:

![servers](servers.png){: .normal}

# Step 5: Provision PostgreSQL Database Servers

## Step 5.1: Create Database Servers

We start by provisioning two private servers that will host our Database cluster — one primary and one replica.

### Primary Database

- **Name**: `db-primary`
- **Type**: CAX31 (8 vCPU, 16 GB RAM)
- **Image**: Ubuntu 24.04
- **Networking**:
  - ❌ **No public IPv4** (private only)
  - ❌ **No public IPv6** (private only)
  - ✅ **Attach to production-network**
- **Tags** (optional but recommended):
  - role=db
  - env=production
- **Cloud Config**: Paste the cloud-init configuration we created above
- **SSH Key**: Add your SSH key

### 🔷 `db-replica` (Hot Standby)

- **Name**: `db-replica`
- **Same configuration as Primary Database**

> Replica has lighter workload, it handles only read queries and replication, not write load, so we can use a smaller server type (e.g. 2 vCPU, 8 GB RAM)

## Step 5.2: Why We Use Separate Volumes for PostgreSQL

Even though each server comes with its own local SSD, we **intentionally use network-attached volumes** for PostgreSQL data.

### ⚠️ Reasons to Use Volumes (Not the Local SSD):

| Reason                     | Description                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Data Persistence**       | If the server crashes, is deleted, or rebuilt, your database survives — volumes are independent of the VM. |
| **Disaster Recovery**      | Volumes can be snapshotted and re-attached to new servers for fast recovery.                               |
| **Modular Scaling**        | Need more storage? Resize or swap the volume without touching the base system.                             |
| **Separation of Concerns** | Keeps your app, OS, and logs separate from mission-critical data — clean architecture.                     |
| **Docker Compatibility**   | Dockerized PostgreSQL expects persistent mounts for durability — volumes meet that need.                   |

> ✅ Using volumes is a standard best practice in any production-grade setup. It ensures **data resilience, maintainability, and scalability**.


## Step 5.3: Create and Attach Persistent Storage Volumes

Now that the servers are running, let’s create the volumes and attach them to the respective machines.

In the left menu, select "Volumes" and then click "Create Volume".

unfortunately, in the Hetzner UI, I cannot create a volume at the moment because of a bug there, when I try to create a volume with 100GB it says volumen cannot be larger than 4GB, and when I try to create a volume with 4GB it says volume cannot be smaller than 10GB.ut I'll update this section when the bug is fixed.

![hetzner-volume-error](hetzner-volume-error.png){: .normal}

# Step 6: Monitoring Server

## Why We Need Dedicated Monitoring

A monitoring server provides:

- **System Visibility**: Track performance, errors, and resource usage
- **Proactive Alerts**: Know about problems before users do
- **Historical Data**: Analyze trends and plan capacity
- **Troubleshooting**: Quickly identify root causes of issues

Without monitoring, you're flying blind in production.

## How to Create the Monitoring Server

### Step 6.1: Create Monitoring Server

**Monitoring Server:**
- **Name**: `monitor-01`
- **Server Type**: CAX21 (4 vCPU, 8GB RAM)
- **Image**: Ubuntu 24.04
- **Networking**:
  - ❌ **No public IPv4** (private only)
  - ❌ **No public IPv6** (private only)
  - ✅ **Attach to production-network**
- **Tags** (optional but recommended):
  - role=monitoring
  - env=production
- **Cloud Config**: Paste the cloud-init configuration we created above
- **SSH Key**: Add your SSH key

> This server will run Prometheus for metrics collection and Grafana for dashboards.

# Step 7: Hetzner Load Balancer

## Why We Need a Load Balancer

A load balancer provides:

- **Traffic Distribution**: Spreads requests across multiple app servers
- **Health Checks**: Automatically removes failed servers from rotation
- **SSL Termination**: Handles SSL/TLS encryption/decryption
- **High Availability**: Single point of entry that's managed by Hetzner

> This is what makes your application truly "production-ready" - users always get a response even if servers fail.

## How to Create the Load Balancer

### Step 7: Create Hetzner Load Balancer

In the left menu, select "Load Balancers" and then click "Create Load Balancer".

1. **Configure Load Balancer**:
   - **Name**: `rails-lb`
   - **Location**: Same as your servers (e.g., `Falkenstein`)
   - **Type**: LB-11 (basic tier)
   - **Network**: Select `production-network` (enables private communication)
   - **Algorithm**: Round Robin (default)
   - **Targets**:
      * Click on **Add Target** dropdown, and then select **Cloud Server**
      * Then at the right side, select our app servers
        - app-01
        - app-02
    - **Services**: Delete the existing service, we will create it later.

![lb-targets](lb-targets.png){: .normal}
![lb-services](lb-services.png){: .normal}

# Step 8: CloudFlare Integration

## Why We Need CloudFlare

CloudFlare provides:

- **DDoS Protection**: Protects against malicious traffic
- **Global CDN**: Faster content delivery worldwide
- **SSL Management**: Automatic SSL certificate management
- **DNS Management**: Reliable, fast DNS resolution

This is your first line of defense and performance optimization.

## How to Configure CloudFlare

### Step 8.1: Generate CloudFlare Origin Certificate

1. **In CloudFlare Dashboard for your domain**:
   - Go to SSL/TLS → Origin Server
   - Click "Create Certificate"
   - Keep default settings and generate
   - Now you can see certificate and private key. which we will use in the next step.

![cloudflare-origin](cloudflare-origin.png){: .normal}
![cloudflare-create](cloudflare-create.png){: .normal}
![cloudflare-keys](cloudflare-keys.png){: .normal}

### Step 8.2: Upload Certificate to Load Balancer

1. **In Hetzner Cloud Console**:
   - Go to Load Balancers → Click on rails-lb → Go to Services tab
   - Click on **Add Service** -> **New Service**:
      - **Protocol**: HTTPS
      - **Listen Port**: 443
      - **Destination Port**: 80
      - **HTTP Redirect**: Enabled (to redirect HTTP to HTTPS)
    - Click on **Add Certificate**
      - In the right side, Click on **Add Certificate** then **Upload Certificate**
      - Name: `cloudflare-certificate-1`
      - Paste CloudFlare origin certificate and private key from previous step
        - **Certificate**: Paste the Origin Certificate content from CloudFlare
        - **Private Key**: Paste the Private Key content from CloudFlare
      - And click on Save Certificate button

![lb-certificates](lb-certificates.png){: .normal}

    - Click on Edit button (pen icon) right side of the existing service
      - Keep everything as it is just change the path to `/up` (our rails health check url)
      - **Health Check**:
        - Protocol: HTTP
        - Port: 80
        - Path: `/up`
        - Interval: 15s
        - Timeout: 5s
        - Retries: 3
        - Status Codes: ["2??", "3??"]
        - Domain: leave it empty
        - Reponse: leave it empty
        - TLS: Disabled

![lb-health-check](lb-health-check.png){: .normal}

### Step 8.3: Configure DNS and SSL

Go back to Cloudflare dashboard and configure the following for your domain:

1. **DNS Records**:

- In the left side click on **DNS** and then click on **Records** button:
- Then click on **Add Record** button and add the following record:

   ```
   Type: A
   Name: @
   Content: LOAD_BALANCER_PUBLIC_IP
   Proxy: Enabled (orange cloud)
   ```

- Replace `LOAD_BALANCER_PUBLIC_IP` with the public IP of your **Hetzner Load Balancer**.
- and click on **Save**

![dns-add-record](dns-add-record.png){: .normal}
![dns-lb-ip](dns-lb-ip.png){: .normal}

2. **SSL/TLS Settings**:

- In the left side click on **SSL/TLS** and then click on **Edge Certificates**:
  - Enable "Always Use HTTPS"
  - You can enable "HTTP Strict Transport Security (HSTS)" as well.

![use-https](use-https.png){: .normal}

# Step 9: Firewall Configuration

## Why We Need Multi-Layered Firewalls

Firewalls provide defense-in-depth security:

- **Perimeter Defense**: Hetzner Cloud Firewalls block unwanted public traffic
- **Internal Segmentation**: Host-based firewalls enforce zero-trust between servers
- **Principle of Least Privilege**: Only allow the minimum required connections
- **Attack Surface Reduction**: Limit potential entry points for attackers

**Critical**: Hetzner Cloud Firewalls don't filter traffic between servers on the same private network, so host-based firewalls are essential.

## How to Configure Firewalls

### Step 9.1: Hetzner Cloud Firewalls (Perimeter Defense)

In the left menu, select "Firewalls" and then click "Create Firewall".

**Bastion Firewall:**
1. Create firewall: `bastion-firewall`
2. Inbound Rules:
   - Allow TCP port 22 from and IP, or from YOUR_IP/32 only
   - Allow ICMP for diagnostics
3. Apply to: bastion-server only

![firewalls-bastion-rules](firewalls-bastion-rules.png){: .normal}
![firewalls-bastion-servers](firewalls-bastion-servers.png){: .normal}


### Step 9.2: Host-Based Firewalls (Internal Segmentation)

First of all we need to be able to connect to our servers, but it's not possibel to do it simply by using
`ssh root@YOUR_SERVER_PUBLIC_IP` because our servers have no public IP. look at them:

![servers-final-list](servers-final-list.png){: .normal}

only bastion server has a public IP, so must connect to the others through the bastion server. To do this we need some configs in our ssh local machine.

Open your `~/.ssh/config` file and add the following configuration:
Don't forget to replace `BASTION_PUBLIC_IP` with the actual public IP of your bastion server. and the user `deployer` with the user you created in the bastion server, and all private IPs with the actual private IPs of your servers.

Just remember only the bastion server use `deployer` user, the others use `root` user.

```bash
# ~/.ssh/config
Host hetzner-bastion
  HostName BASTION_PUBLIC_IP
  User deployer

Host app-01
  HostName 10.0.0.3
  User root
  ProxyJump hetzner-bastion
Host app-02
  HostName 10.0.0.4
  User root
  ProxyJump hetzner-bastion
Host jobs-01
  HostName 10.0.0.5
  User root
  ProxyJump hetzner-bastion
Host db-primary
  HostName 10.0.0.6
  User root
  ProxyJump hetzner-bastion
Host db-replica
  HostName 10.0.0.7
  User root
  ProxyJump hetzner-bastion
Host monitor-01
  HostName 10.0.0.8
  User root
  ProxyJump hetzner-bastion
```

Now after saving those changes, you can easily connect to each server just by typing `ssh <server-name>`.

```bash
ssh app-01
```

**App Servers:**
as we mentioned before, Hetzner Cloud Firewalls don't filter traffic between servers on the same private network, so host-based firewalls are essential. to do this, we need to connect to each server and apply some changes:

first connect to server `app-01` by running this in your terminal:

```bash
ssh app-01
```

Then you will be connected to the server, and run these commands there:

```bash
# Update and upgrade the system packages
sudo apt update && sudo apt upgrade -y

# Install UFW (Uncomplicated Firewall)
sudo apt install ufw -y

# Set default policies
# Deny all incoming traffic by default
# Allow all outgoing traffic by default
# This is a good starting point for security
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from bastion only. Replace 10.0.0.2 with the actual private IP of your bastion server
sudo ufw allow from 10.0.0.2 to any port 22 proto tcp

# App traffic from load balancer private IP. Replace 10.0.0.9 with the actual private IP of your load balancer
sudo ufw allow from 10.0.0.9 to any port 80 proto tcp

# Monitoring access. Replace 10.0.0.8 with the actual private IP of your monitoring server
sudo ufw allow from 10.0.0.8 to any port 9394 proto tcp

sudo ufw --force enable
```

Run the exactly the same commands for `app-02` server. to do this, just open a new terminal and run:

```bash
ssh app-02
```

Then run the same commands as above.

**Jobs Server:**

We will do the same for the jobs server, but we need to allow access from app servers as well, because jobs server needs to communicate with app servers. and there is no income traffic from load balancer to jobs server, so we don't need to allow that.

first connect to server `jobs-01` by running this in your terminal:

```bash
ssh jobs-01
```

Then you will be connected to the server, and run these commands there:

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install ufw -y

sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from bastion only. Replace 10.0.0.2 with the actual private IP of your bastion server
sudo ufw allow from 10.0.0.2 to any port 22 proto tcp

# HTTP access from app servers (for API calls, webhooks, etc.)
# Replace 10.0.0.03 and 10.0.0.04 with the actual private IPs of your app servers
sudo ufw allow from 10.0.0.03 to any port 80 proto tcp
sudo ufw allow from 10.0.0.04 to any port 80 proto tcp

# Monitoring access. Replace 10.0.0.8 with the actual private IP of your monitoring server
sudo ufw allow from 10.0.0.8 to any port 9394 proto tcp

sudo ufw --force enable
```

**PostgreSQL Primary:**

We will do the same for the primary database server, but we need to allow access from app servers and jobs server as well, because they need to communicate with the database. and there is no income traffic from load balancer to database server, so we don't need to allow that. and we need to allow access from the replica server for replication.
first connect to server `db-primary` by running this in your terminal:

```bash
ssh db-primary
```

Then you will be connected to the server, and run these commands there:

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install ufw -y

sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from bastion only. Replace 10.0.0.2 with the actual private IP of your bastion server
sudo ufw allow from 10.0.0.2 to any port 22 proto tcp

# HTTP access from app servers (for API calls, webhooks, etc.)
# Replace 10.0.0.03 and 10.0.0.04 with the actual private IPs of your app servers
sudo ufw allow from 10.0.0.03 to any port 80 proto tcp
sudo ufw allow from 10.0.0.04 to any port 80 proto tcp

# Replication from replica server. Replace 10.0.0.7 with the actual private IP of your replica server
sudo ufw allow from 10.0.0.7 to any port 9394 proto tcp

# Monitoring access. Replace 10.0.0.8 with the actual private IP of your monitoring server
sudo ufw allow from 10.0.0.8 to any port 9394 proto tcp

sudo ufw --force enable
```

**PostgreSQL Replica (10.0.0.21):**
```bash
ssh db-replica << 'EOF'
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from bastion only
sudo ufw allow from 10.0.0.2 to any port 22 proto tcp

# Replication from primary
sudo ufw allow from 10.0.0.20 to any port 5432 proto tcp

# Monitoring access
sudo ufw allow from 10.0.0.40 to any port 9187 proto tcp

sudo ufw --force enable
EOF
```

**Monitoring Server (10.0.0.40):**
```bash
ssh monitor-01 << 'EOF'
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from bastion only
sudo ufw allow from 10.0.0.2 to any port 22 proto tcp

# Prometheus access from bastion (for web UI)
sudo ufw allow from 10.0.0.2 to any port 9090 proto tcp

# Grafana access from bastion (for web UI)
sudo ufw allow from 10.0.0.2 to any port 3001 proto tcp

sudo ufw --force enable
EOF
```

# Step 10: Database Cluster Setup

## Why We Configure PostgreSQL This Way

Our PostgreSQL setup provides:

- **Persistent Storage**: Data survives server failures
- **Streaming Replication**: Near real-time backup with automatic failover capability
- **Kamal Integration**: Database lifecycle managed consistently with apps
- **Performance Optimization**: Tuned for Rails workloads

## How to Setup PostgreSQL with Replication

### Step 10.1: Prepare Storage Volumes

Format and mount the attached volumes on both database servers:

```bash
for server in db-primary db-replica; do
    ssh $server << 'EOF'
# Format the attached volume
sudo mkfs.ext4 /dev/sdb

# Create mount point
sudo mkdir -p /mnt/data/postgresql

# Get UUID for persistent mounting
UUID=$(sudo blkid -s UUID -o value /dev/sdb)

# Add to fstab for automatic mounting
echo "UUID=$UUID /mnt/data/postgresql ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Mount the volume
sudo mount -a

# Set proper permissions for PostgreSQL container (user 999)
sudo chown -R 999:999 /mnt/data/postgresql
EOF
done
```

### Step 10.2: Install Docker on All Servers

```bash
for server in app-01 app-02 jobs-01 db-primary db-replica; do
    ssh $server << 'EOF'
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add deployer user to docker group
sudo usermod -aG docker deployer

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker
EOF
done
```

### Step 10.3: Configure Kamal for PostgreSQL

Create your `config/deploy.yml` with PostgreSQL accessories:

```yaml
# config/deploy.yml
service: myapp
image: username/myapp

registry:
  username: your-docker-username
  password:
    - KAMAL_REGISTRY_PASSWORD

# SSH configuration using bastion host
ssh:
  user: deployer
  proxy: deployer@BASTION_PUBLIC_IP

# Server roles mapped to private IPs
servers:
  web:
    hosts:
      - 10.0.0.10  # app-01
      - 10.0.0.11  # app-02
    options:
      memory: 2g
      cpus: 2
  job:
    hosts:
      - 10.0.0.30  # jobs-01
    cmd: bundle exec rails solid_queue:start
    options:
      memory: 1g

# Environment variables
env:
  clear:
    RAILS_ENV: production
    RAILS_SERVE_STATIC_FILES: true
    RAILS_LOG_TO_STDOUT: true
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL
    - POSTGRES_PASSWORD

# PostgreSQL accessories
accessories:
  db:
    image: postgres:16
    host: 10.0.0.20  # db-primary
    port: 5432
    env:
      clear:
        POSTGRES_USER: rails_app
        POSTGRES_DB: rails_production
      secret:
        - POSTGRES_PASSWORD
    volumes:
      - /mnt/data/postgresql:/var/lib/postgresql/data

  db-replica:
    image: postgres:16
    host: 10.0.0.21  # db-replica
    port: 5432
    volumes:
      - /mnt/data/postgresql:/var/lib/postgresql/data

# Proxy configuration
proxy:
  ssl: false  # CloudFlare handles SSL
  host: yourdomain.com
  healthcheck:
    path: /up
    port: 3000
```

### Step 10.4: Configure Secrets

Create `.kamal/secrets`:

```bash
# .kamal/secrets
KAMAL_REGISTRY_PASSWORD=your_docker_registry_password
RAILS_MASTER_KEY=your_rails_master_key
POSTGRES_PASSWORD=very_strong_postgres_password

# Database connection using private IP
DATABASE_URL=postgresql://rails_app:very_strong_postgres_password@10.0.0.20:5432/rails_production
```

### Step 10.5: Setup PostgreSQL Primary

```bash
# Deploy the primary database
kamal accessory boot db

# Configure for replication
kamal accessory exec db -i << 'EOF'
# Edit postgresql.conf for replication
cat >> /var/lib/postgresql/data/postgresql.conf << 'PGCONF'
# Replication settings
listen_addresses = '*'
wal_level = replica
max_wal_senders = 5
wal_keep_size = 256
hot_standby = on
PGCONF

# Edit pg_hba.conf for replication and app access
cat >> /var/lib/postgresql/data/pg_hba.conf << 'PGHBA'
# Replication connection from replica
host replication replicator 10.0.0.21/32 scram-sha-256
# Application connections
host all rails_app 10.0.0.10/32 scram-sha-256
host all rails_app 10.0.0.11/32 scram-sha-256
host all rails_app 10.0.0.30/32 scram-sha-256
PGHBA

# Create replication user
psql -U postgres -c "CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD 'replica_password_here';"

# Create application user and database
psql -U postgres -c "CREATE USER rails_app WITH ENCRYPTED PASSWORD 'very_strong_postgres_password';"
psql -U postgres -c "CREATE DATABASE rails_production OWNER rails_app;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rails_production TO rails_app;"
EOF

# Restart to apply configuration
kamal accessory reboot db
```

### Step 10.6: Setup PostgreSQL Replica

```bash
# Stop replica if running
kamal accessory stop db-replica

# Clear data directory on replica host
ssh db-replica 'sudo rm -rf /mnt/data/postgresql/*'

# Create base backup from primary
kamal accessory run db-replica -i << 'EOF'
export PGPASSWORD='replica_password_here'
pg_basebackup -h 10.0.0.20 -D /var/lib/postgresql/data -U replicator -v -P -R -X stream
EOF

# Start replica in standby mode
kamal accessory boot db-replica
```

# Step 11: Rails Application Configuration

## Why We Configure Rails This Way

Rails 8 with Solid components provides:

- **Solid Queue**: Database-backed job queue (no Redis needed)
- **Solid Cache**: Shared caching across app servers
- **Solid Cable**: Database-backed WebSocket connections
- **Simplified Stack**: Everything runs on PostgreSQL

## How to Configure Rails for Production

### Step 11.1: Rails Application Setup

**Gemfile additions:**
```ruby
# Gemfile
gem 'solid_queue'
gem 'solid_cache'
gem 'solid_cable'
gem 'prometheus-client'
gem 'yabeda-rails'
gem 'yabeda-prometheus'
```

**Configure Solid Queue:**
```ruby
# config/environments/production.rb
config.active_job.queue_adapter = :solid_queue

# config/solid_queue.yml
production:
  dispatchers:
    - polling_interval: 1
      batch_size: 500
  workers:
    - queues: "*"
      threads: 3
      processes: 2
```

**Configure Solid Cache:**
```ruby
# config/environments/production.rb
config.cache_store = :solid_cache_store

# config/solid_cache.yml
production:
  store_options:
    max_age: 1.day
    max_entries: 1_000_000
```

**Configure Solid Cable:**
```ruby
# config/cable.yml
production:
  adapter: solid_cable
  connects_to:
    database:
      writing: primary
```

### Step 11.2: Application Metrics

```ruby
# config/initializers/yabeda.rb
require 'yabeda/prometheus'

Yabeda.configure do
  group :rails do
    counter :requests_total, comment: 'Total requests', tags: [:method, :status, :controller, :action]
    histogram :request_duration, comment: 'Request duration', tags: [:method, :controller, :action]
  end

  group :solid_queue do
    gauge :jobs_queued, comment: 'Queued jobs count'
    gauge :jobs_running, comment: 'Running jobs count'
  end
end

# Expose metrics endpoint
Rails.application.routes.draw do
  get '/metrics', to: proc { |env|
    [200, {'Content-Type' => 'text/plain'}, [Yabeda::Prometheus::Exporter.to_s]]
  }
end
```

# Step 12: Monitoring Server Setup

## Why We Need Comprehensive Monitoring

Monitoring provides:

- **System Health**: Track CPU, memory, disk usage across all servers
- **Application Performance**: Monitor Rails request times, error rates
- **Database Metrics**: PostgreSQL performance and replication status
- **Business Metrics**: Track user activity, revenue, custom KPIs

## How to Setup Monitoring

### Step 12.1: Install Monitoring Stack

```bash
ssh monitor-01 << 'EOF'
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker deployer

# Create monitoring directory
mkdir -p /opt/monitoring
cd /opt/monitoring

# Create docker-compose.yml
cat > docker-compose.yml << 'COMPOSE'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=strong_admin_password_here
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  postgres_exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://rails_app:very_strong_postgres_password@10.0.0.20:5432/rails_production?sslmode=disable"
    ports:
      - "9187:9187"
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
COMPOSE

# Create Prometheus configuration
cat > prometheus.yml << 'PROM'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'rails-apps'
    static_configs:
      - targets: ['10.0.0.10:9394', '10.0.0.11:9394']
    metrics_path: '/metrics'

  - job_name: 'rails-jobs'
    static_configs:
      - targets: ['10.0.0.30:9394']
    metrics_path: '/metrics'
PROM

# Start monitoring stack
docker-compose up -d
EOF
```

### Step 12.2: Access Monitoring Dashboards

You can access the monitoring tools via SSH tunneling through the bastion:

```bash
# Grafana dashboard
ssh -L 3001:10.0.0.40:3001 hetzner-bastion
# Then visit http://localhost:3001 (admin/strong_admin_password_here)

# Prometheus metrics
ssh -L 9090:10.0.0.40:9090 hetzner-bastion
# Then visit http://localhost:9090
```

# Step 13: Deployment and Operations

## How to Deploy with Kamal

### Step 13.1: Initial Deployment

```bash
# Setup servers and deploy for the first time
kamal setup

# Check deployment status
kamal app details

# View application logs
kamal app logs --follow
```

### Step 13.2: Regular Operations

```bash
# Deploy new versions
kamal deploy

# Run database migrations
kamal app exec 'bin/rails db:migrate'

# Access Rails console
kamal app exec --interactive --reuse 'bin/rails console'

# Restart accessories
kamal accessory reboot db
kamal accessory reboot db-replica

# Scale if needed (add more servers to config/deploy.yml first)
kamal deploy
```

# Step 14: Backup and Maintenance

## Automated Backup Strategy

### Step 14.1: Database Backups

```bash
# Create backup script on bastion
ssh hetzner-bastion << 'EOF'
sudo mkdir -p /opt/scripts
sudo cat > /opt/scripts/backup-postgres.sh << 'BACKUP'
#!/bin/bash
set -e

DB_NAME="rails_production"
DB_USER="rails_app"
BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create SQL dump from primary database
kamal accessory exec db pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

# Clean old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
BACKUP

sudo chmod +x /opt/scripts/backup-postgres.sh

# Schedule daily backups
echo "0 3 * * * root /opt/scripts/backup-postgres.sh" | sudo tee -a /etc/crontab
EOF
```

### Step 14.2: System Maintenance

```bash
# Create system update script
ssh hetzner-bastion << 'EOF'
sudo cat > /opt/scripts/update-all-servers.sh << 'UPDATE'
#!/bin/bash

SERVERS=(
    "hetzner-bastion"
    "app-01"
    "app-02"
    "jobs-01"
    "db-primary"
    "db-replica"
    "monitor-01"
)

for server in "${SERVERS[@]}"; do
    echo "Updating $server..."
    ssh "$server" << 'REMOTE'
        sudo apt update
        sudo apt upgrade -y
        sudo apt autoremove -y

        if [ -f /var/run/reboot-required ]; then
            echo "REBOOT REQUIRED for $(hostname)"
        fi
REMOTE
done

echo "Updates completed for all servers!"
UPDATE

sudo chmod +x /opt/scripts/update-all-servers.sh

# Schedule monthly updates
echo "0 4 1 * * root /opt/scripts/update-all-servers.sh" | sudo tee -a /etc/crontab
EOF
```

## Staging Environment

Create a simplified staging environment on a single server:

```bash
# Create staging server
hcloud server create \
  --name staging-server \
  --type cx32 \
  --image ubuntu-24.04 \
  --ssh-key rails-production \
  --location fsn1

# Create staging configuration
# config/deploy.staging.yml
service: myapp-staging
image: username/myapp-staging

servers:
  web:
    hosts:
      - STAGING_SERVER_PUBLIC_IP
  job:
    hosts:
      - STAGING_SERVER_PUBLIC_IP

accessories:
  db:
    image: postgres:16
    host: STAGING_SERVER_PUBLIC_IP
    port: 5432
    env:
      clear:
        POSTGRES_USER: myapp_staging
        POSTGRES_DB: myapp_staging
      secret:
        - POSTGRES_PASSWORD

proxy:
  ssl: true
  host: staging.yourdomain.com

# Deploy to staging
kamal setup -d staging
kamal deploy -d staging
```

## Conclusion

You now have a production-ready Rails infrastructure that provides:

**🔒 Enterprise Security:**
- Private network isolation
- Multi-layered firewalls
- Single bastion entry point
- End-to-end encryption

**🚀 High Availability:**
- Load-balanced application servers
- PostgreSQL replication
- Health monitoring and failover
- Zero-downtime deployments

**📊 Modern Rails Stack:**
- Solid Queue for background jobs
- Solid Cache for distributed caching
- Solid Cable for WebSocket connections
- Comprehensive monitoring

**💰 Cost Efficiency:**
- ~€180/month total cost
- 50-70% cheaper than AWS/GCP
- No vendor lock-in
- Simple operational model

**📈 Observability:**
- Application performance monitoring
- Infrastructure health tracking
- Centralized logging
- Custom business metrics

This architecture scales horizontally by adding more application servers to the load balancer, provides automatic failover for critical components, and maintains operational simplicity through Kamal's container orchestration.

Your Rails application is now running on enterprise-grade infrastructure that can handle serious production workloads while maintaining the development velocity that Rails is known for.
- **🏰 Private Zone**: All application and database servers (no public access)
- **📦 Storage Zone**: Object storage (API access only)

### Deployment Strategy

- **Kamal**: Modern container deployment tool from Rails team
- **Zero-Downtime**: Rolling deployments with health checks
- **Multi-Environment**: Separate production and staging configurations
- **Infrastructure as Code**: All configuration version-controlled

---

## Ready to Build?

This architecture provides enterprise-grade security, availability, and performance while maintaining operational simplicity and cost efficiency. The complete setup takes about 2-3 hours following this guide.

**What you'll need:**
- Hetzner Cloud account
- Domain name (for CloudFlare)
- Local machine with SSH and Docker
- Basic understanding of Rails deployment

**Let's get started with the step-by-step implementation guide below!**

---

This guide provides a comprehensive, step-by-step blueprint for deploying a production-ready Ruby on Rails application on Hetzner Cloud. The architecture is designed to meet stringent requirements for high availability, scalability, and security, leveraging a modern, container-based workflow with Kamal.

This approach consciously avoids the operational overhead of Kubernetes while delivering a robust, enterprise-grade infrastructure. The core philosophy is "security-first," achieved by constructing a fortress-like network topology where all critical services are shielded from public access, communicating exclusively over a private network.

## Part 1: Foundational Infrastructure and Security: Building the Fortress

Establishing a secure and resilient foundation is the most critical phase of infrastructure design. Before any application code is deployed, a well-architected network and hardened server environment must be in place.

### Section 1.1: Architecting the Secure Network Backbone

The primary objective is to create a completely isolated private network for all application and data services. This network will have a single, controlled, and monitored point of ingress and egress, drastically reducing the attack surface.

#### Step-by-Step: Creating a Hetzner Cloud Private Network

The first step is to define the private network space within the Hetzner Cloud environment. This provides a Layer 3 network for your servers to communicate without exposing traffic to the public internet.

1. **Navigate to the Hetzner Cloud Console**: Log in to your Hetzner Cloud project.

2. **Create the Network**: In the left menu, select "Networks" and then click "Create network".

3. **Define Network Parameters**:
   - **Name**: Provide a descriptive name, such as `production-network`.
   - **IP Range**: Define a private IP range. Use a CIDR block of `10.0.0.0/16`, providing 65,534 available IP addresses for future expansion.

This action creates the virtual network fabric to which all subsequent private servers will be attached.

#### Step-by-Step: Provisioning and Hardening the Bastion & NAT Gateway Server

The bastion host serves as the cornerstone of the security model. It acts as the single, hardened gateway for both administrative access and outbound internet traffic from the private network. Combining the Network Address Translation (NAT) role onto this server streamlines the architecture, reduces costs, and creates a unified entry/exit point that is easier to secure and monitor.

1. **Provision the Server**: In the Hetzner Cloud Console, create a new cloud server:
   - **Server Type**: CX22 (sufficient for this role)
   - **Location**: Choose the same location as your other planned servers
   - **Image**: Select Ubuntu 24.04
   - **Networking**: **Critical step** - Assign a public IPv4 address AND attach it to the `production-network`
   - **SSH Key**: Add your public SSH key for secure initial access

2. **Update System Packages**: Once the server is running, connect via SSH and update:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Create Non-Root User with Sudo Privileges**: It's critical to disable direct root login and use a non-root user with sudo privileges.

   ```bash
   # Create new user (replace 'deployer' with your preferred username)
   adduser deployer

   # Add user to sudo group
   usermod -aG sudo deployer

   # Create SSH directory for new user
   mkdir -p /home/deployer/.ssh

   # Copy authorized keys from root
   cp /root/.ssh/authorized_keys /home/deployer/.ssh/authorized_keys

   # Set proper ownership and permissions
   chown -R deployer:deployer /home/deployer/.ssh
   chmod 700 /home/deployer/.ssh
   chmod 600 /home/deployer/.ssh/authorized_keys
   ```

4. **Configure SSH Daemon**: Edit `/etc/ssh/sshd_config` to enhance security:
   ```bash
   sudo nano /etc/ssh/sshd_config
   ```

   Make these changes:
   - `PasswordAuthentication no` (disable password authentication)
   - `PermitRootLogin no` (disable root login)

   Restart SSH service:
   ```bash
   sudo systemctl restart sshd
   ```

5. **Configure NAT Gateway**: Set up the server to act as a NAT gateway for private servers:
   ```bash
   # Enable IP forwarding
   echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

   # Make IP forwarding persistent
   echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf

   # Configure iptables for NAT
   sudo iptables -t nat -A POSTROUTING -s '10.0.0.0/16' -o eth0 -j MASQUERADE

   # Install iptables-persistent to save rules
   sudo apt install iptables-persistent -y
   sudo netfilter-persistent save
   ```

#### Step-by-Step: Defining the Master Network Route in Hetzner Cloud

The final piece of the networking puzzle is to instruct the Hetzner Cloud network fabric how to route outbound internet traffic from your private-only servers.

1. **Navigate to Network Settings**: In the Hetzner Cloud Console, go to "Networks" and select your `production-network`.

2. **Add a Route**: Go to the "Routes" tab and click "Add route":
   - **Destination**: `0.0.0.0/0` (represents all possible IPv4 addresses)
   - **Gateway**: Enter the private IP address of your Bastion/NAT server (e.g., `10.0.0.2`)

This configuration ensures that when any server in the private network tries to contact an external IP, the request is first sent to the Bastion/NAT server, which then performs NAT and forwards the request to the public internet.

### Section 1.2: Provisioning the Private Server Fleet

With the secure network backbone established, the next step is to provision the servers that will run the application components. These servers will be created without any direct public internet connectivity.

#### Automating Initial Setup with cloud-init

To ensure that private-only servers can correctly route outbound traffic through the NAT gateway from the moment they are created, use a cloud-init script during provisioning. This automates the network configuration, ensuring consistency and reducing manual setup errors.

Create a cloud-init configuration file:

```yaml
# cloud-init.yaml
#cloud-config
write_files:
  - path: /etc/systemd/network/10-enp7s0.network
    content: |
      [Match]
      Name=enp7s0
      [Network]
      DHCP=yes
      Gateway=10.0.0.1
    append: true
  - path: /etc/systemd/resolved.conf
    content: |
      DNS=185.12.64.2 185.12.64.1
      FallbackDNS=8.8.8.8
    append: true
runcmd:
  - reboot
```

#### Provisioning Servers without Public IPs

Create the following servers in the Hetzner Cloud Console for the production environment. For each server:

- Select the same location as the Bastion/NAT server
- Choose appropriate server type based on expected load
- Under "Networking," do NOT assign a public IPv4 address
- Attach the server to the `production-network`
- Add your SSH key
- Upload the cloud-init script in the "Cloud config" section

**Production Server Fleet:**

1. **App Server 1** (`app-01`): CCX23 - For the Rails application
2. **App Server 2** (`app-02`): CCX23 - For the Rails application (high availability)
3. **Sidekiq Server** (`sidekiq-01`): CX32 - For background jobs
4. **PostgreSQL Primary** (`db-primary`): CCX23 - The main database server
5. **PostgreSQL Replica** (`db-replica`): CCX13 - The standby database server

**Network IP Assignment:**
```
10.0.0.2   - Bastion/NAT Gateway (public + private)
10.0.0.10  - Rails App Server 1 (private only)
10.0.0.11  - Rails App Server 2 (private only)
10.0.0.20  - PostgreSQL Primary (private only)
10.0.0.21  - PostgreSQL Replica (private only)
10.0.0.30  - Sidekiq Worker (private only)
```

#### Create Persistent Storage Volumes

Database files must be stored on durable, network-attached storage. Create Hetzner Volumes for PostgreSQL:

```bash
# Create volumes for database storage
hcloud volume create --name postgres-primary-data --size 100 --location fsn1
hcloud volume create --name postgres-replica-data --size 100 --location fsn1

# Attach volumes to database servers
hcloud volume attach postgres-primary-data db-primary
hcloud volume attach postgres-replica-data db-replica
```

### Section 1.3: Multi-Layered Firewall Implementation

A robust security posture relies on defense-in-depth. This architecture employs two layers of firewalls: a network-level firewall for perimeter defense and granular host-based firewalls for internal segmentation.

#### Configuring Hetzner Cloud Firewalls for Perimeter Defense

Hetzner Cloud Firewalls are stateful and act as the first line of defense, controlling traffic entering your infrastructure from the public internet.

**Bastion Firewall Policy:**
1. Create firewall: Name: `bastion-firewall`
2. Inbound Rules:
   - Allow TCP on port 22 (SSH) from your specific trusted IP address
   - (Optional) Allow ICMP (ping) for diagnostics
3. Outbound Rules: Allow all traffic (necessary for NAT gateway functionality)
4. Apply to: The Bastion/NAT server only

**Load Balancer Firewall Policy:**
1. Create firewall: Name: `lb-firewall`
2. Inbound Rules:
   - Allow TCP on port 80 (HTTP) from All IPv4/IPv6
   - Allow TCP on port 443 (HTTPS) from All IPv4/IPv6
3. Outbound Rules: Allow all traffic
4. Apply to: The Hetzner Load Balancer only

#### Implementing Granular Host-Based Firewalls with ufw

**Critical Note**: Hetzner Cloud Firewall does not filter traffic between servers on the same private network. This creates a "soft interior" where a compromised server could attack another. To mitigate this risk and enforce the principle of least privilege internally, configure host-based firewalls on every server.

**Enhanced Granular Host-Based Firewalls Configuration:**

**Bastion Server (10.0.0.2):**
```bash
ssh hetzner-bastion << 'EOF'
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing

# SSH access from your IP only
ufw allow from YOUR_PUBLIC_IP to any port 22 proto tcp

# Allow internal SSH forwarding
ufw allow from 10.0.0.0/16 to any port 22 proto tcp

ufw --force enable
EOF
```

**Rails App Servers (10.0.0.10, 10.0.0.11):**
```bash
for server in app-01 app-02; do
    ssh $server << 'EOF'
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing

# SSH from bastion only
ufw allow from 10.0.0.2 to any port 22 proto tcp

# App traffic from load balancer private IP only
ufw allow from LB_PRIVATE_IP to any port 3000 proto tcp

ufw --force enable
EOF
done
```

**PostgreSQL Primary (10.0.0.20):**
```bash
ssh db-primary << 'EOF'
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing

# SSH from bastion only
ufw allow from 10.0.0.2 to any port 22 proto tcp

# Database access from app servers
ufw allow from 10.0.0.10 to any port 5432 proto tcp
ufw allow from 10.0.0.11 to any port 5432 proto tcp

# Database access from Sidekiq worker
ufw allow from 10.0.0.30 to any port 5432 proto tcp

# Replication from replica server
ufw allow from 10.0.0.21 to any port 5432 proto tcp

# Administrative database access from bastion
ufw allow from 10.0.0.2 to any port 5432 proto tcp

ufw --force enable
EOF
```

**PostgreSQL Replica (10.0.0.21):**
```bash
ssh db-replica << 'EOF'
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing

# SSH from bastion only
ufw allow from 10.0.0.2 to any port 22 proto tcp

# Replication connection from primary
ufw allow from 10.0.0.20 to any port 5432 proto tcp

# Administrative access from bastion
ufw allow from 10.0.0.2 to any port 5432 proto tcp

ufw --force enable
EOF
```

**Sidekiq Worker (10.0.0.30):**
```bash
ssh sidekiq-01 << 'EOF'
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing

# SSH from bastion only
ufw allow from 10.0.0.2 to any port 22 proto tcp

# Redis access from app servers (if Redis is co-located here)
ufw allow from 10.0.0.10 to any port 6379 proto tcp
ufw allow from 10.0.0.11 to any port 6379 proto tcp

ufw --force enable
EOF
```

### Section 1.4: Establishing Secure and Seamless Access

To make administration and deployment efficient, configure your local development machine to seamlessly and securely connect to the private servers through the bastion host.

#### Configuring Local SSH for ProxyJump

The ProxyJump directive in an SSH configuration file automates the process of hopping through a bastion host. This eliminates the need for manual two-step SSH connections.

Edit the `~/.ssh/config` file on your local machine:

```bash
# ~/.ssh/config

# --- Hetzner Production ---

# Bastion Host - The single public entry point
Host hetzner-bastion
  HostName BASTION_PUBLIC_IP
  User deployer  # Use your non-root user
  IdentityFile ~/.ssh/your_hetzner_private_key

# Generic rule for all private servers
Host app-* db-* sidekiq-*
  User deployer  # Use your non-root user
  IdentityFile ~/.ssh/your_hetzner_private_key
  ProxyJump hetzner-bastion

# Specific hosts for convenience
Host app-01
  HostName 10.0.0.10

Host app-02
  HostName 10.0.0.11

Host sidekiq-01
  HostName 10.0.0.30

Host db-primary
  HostName 10.0.0.20

Host db-replica
  HostName 10.0.0.21
```

With this configuration, you can now connect directly to any private server from your local terminal with a simple command: `ssh db-primary`. SSH will handle the connection to the bastion and then jump to the target private server automatically.

## Part 2: High-Availability PostgreSQL Cluster

A resilient data layer is paramount for a production application. This section details the setup of a PostgreSQL cluster with persistent storage and streaming replication to ensure data durability and high availability.

### Section 2.1: Deploying Persistent Database Storage

Database files must be stored on durable, network-attached storage, not on the server's local (ephemeral) disk. This decouples the data from the compute instance, allowing for server replacement or resizing without data loss.

#### Best Practices for Filesystem Formatting and Mounting

After attaching the Hetzner Volumes, they must be prepared for use by the operating system:

**On both database servers (db-primary and db-replica):**

```bash
# Connect to the DB servers
ssh db-primary
ssh db-replica

# For each server, run these commands:

# Identify the volume device (usually /dev/sdb)
lsblk

# Format the volume with ext4
sudo mkfs.ext4 /dev/sdb

# Create mount point
sudo mkdir -p /mnt/data/postgresql

# Get UUID for persistent mounting
UUID=$(sudo blkid -s UUID -o value /dev/sdb)

# Add to fstab for automatic mounting on boot
echo "UUID=$UUID /mnt/data/postgresql ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Mount the volume
sudo mount -a

# Set proper permissions for PostgreSQL container (user 999)
sudo chown -R 999:999 /mnt/data/postgresql
```

### Section 2.2: Implementing PostgreSQL Streaming Replication with Kamal

Streaming replication provides high availability by maintaining a live, byte-for-byte copy of the primary database on a replica server. If the primary fails, the replica can be promoted to take its place with minimal data loss.

The setup uses a hybrid approach: Kamal manages the PostgreSQL containers as "accessories," ensuring their lifecycle is managed consistently with the rest of the application. However, the initial one-time configuration to establish the replication link between the two running containers must be performed manually.

#### Step-by-Step: Configuring Kamal for PostgreSQL Accessories

Update your `config/deploy.yml` to include PostgreSQL services:

```yaml
# config/deploy.yml (PostgreSQL section)
accessories:
  db:
    image: postgres:16
    host: 10.0.0.20  # db-primary private IP
    port: 5432
    env:
      clear:
        POSTGRES_USER: rails_app
        POSTGRES_DB: rails_production
      secret:
        - POSTGRES_PASSWORD
    volumes:
      - /mnt/data/postgresql:/var/lib/postgresql/data

  db-replica:
    image: postgres:16
    host: 10.0.0.21  # db-replica private IP
    port: 5432
    volumes:
      - /mnt/data/postgresql:/var/lib/postgresql/data
```

#### Step-by-Step: Configuring the Primary PostgreSQL Server

Deploy and configure the primary database:

```bash
# Deploy the primary database
kamal accessory boot db

# Configure for replication
kamal accessory exec db -i << 'EOF'
# Edit postgresql.conf for replication
cat >> /var/lib/postgresql/data/postgresql.conf << 'PGCONF'
# Replication settings
listen_addresses = '*'
wal_level = replica
max_wal_senders = 5
wal_keep_size = 256
hot_standby = on
PGCONF

# Edit pg_hba.conf for replication access
cat >> /var/lib/postgresql/data/pg_hba.conf << 'PGHBA'
# Replication connection from replica
host replication replicator 10.0.0.21/32 scram-sha-256
# Application connections
host all rails_app 10.0.0.10/32 scram-sha-256
host all rails_app 10.0.0.11/32 scram-sha-256
host all rails_app 10.0.0.30/32 scram-sha-256
PGHBA

# Create replication user
psql -U postgres -c "CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD 'replica_password_here';"

# Create application user and database
psql -U postgres -c "CREATE USER rails_app WITH ENCRYPTED PASSWORD 'rails_password_here';"
psql -U postgres -c "CREATE DATABASE rails_production OWNER rails_app;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rails_production TO rails_app;"
EOF

# Restart to apply configuration
kamal accessory reboot db
```

#### Step-by-Step: Initializing the Replica Server

Configure the replica server:

```bash
# Stop replica if running
kamal accessory stop db-replica

# Clear data directory on replica host
ssh db-replica 'sudo rm -rf /mnt/data/postgresql/*'

# Create base backup from primary
kamal accessory run db-replica -i << 'EOF'
export PGPASSWORD='replica_password_here'
pg_basebackup -h 10.0.0.20 -D /var/lib/postgresql/data -U replicator -v -P -R -X stream
EOF

# Start replica in standby mode
kamal accessory boot db-replica
```

#### Step-by-Step: Verifying and Monitoring Replication Health

**On the Primary:**
```bash
kamal accessory exec db -i psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

**On the Replica:**
```bash
kamal accessory exec db-replica -i psql -U postgres -c "SELECT pg_is_in_recovery();"
```

## Part 3: Application Deployment and Configuration with Kamal

This section focuses on the `config/deploy.yml` file, which orchestrates the deployment of the entire application stack, including the Rails app, Sidekiq workers, and dependent services, all within the secure private network.

### Section 3.1: Configuring Kamal for a Multi-Server Production Environment

The `config/deploy.yml` file is the heart of a Kamal deployment. For this architecture, it must be carefully crafted to map services to their dedicated private servers and to handle the SSH tunneling through the bastion host.

#### Complete config/deploy.yml Configuration

```yaml
# config/deploy.yml
service: myapp
image: username/myapp

# Registry configuration
registry:
  username: your-docker-username
  password:
    - KAMAL_REGISTRY_PASSWORD

# SSH configuration using bastion host
ssh:
  user: deployer  # Your non-root user
  proxy: deployer@BASTION_PUBLIC_IP  # Critical: enables bastion tunneling

# Server roles mapped to private IPs
servers:
  web:
    hosts:
      - 10.0.0.10  # app-01
      - 10.0.0.11  # app-02
    options:
      memory: 2g
      cpus: 2
  job:
    hosts:
      - 10.0.0.30  # sidekiq-01
    cmd: bundle exec sidekiq
    options:
      memory: 1g

# Environment variables
env:
  clear:
    RAILS_ENV: production
    RAILS_SERVE_STATIC_FILES: true
    RAILS_LOG_TO_STDOUT: true
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL
    - REDIS_URL
    - POSTGRES_PASSWORD

# Accessory services
accessories:
  db:
    image: postgres:16
    host: 10.0.0.20  # db-primary
    port: 5432
    env:
      clear:
        POSTGRES_USER: rails_app
        POSTGRES_DB: rails_production
      secret:
        - POSTGRES_PASSWORD
    volumes:
      - /mnt/data/postgresql:/var/lib/postgresql/data

  db-replica:
    image: postgres:16
    host: 10.0.0.21  # db-replica
    port: 5432
    volumes:
      - /mnt/data/postgresql:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    host: 10.0.0.30  # co-located with sidekiq
    port: 6379
    volumes:
      - redis-data:/data

# Proxy configuration for health checks
proxy:
  ssl: false  # CloudFlare handles SSL termination
  host: yourdomain.com
  healthcheck:
    path: /up
    port: 3000
    interval: 10
    timeout: 5

# Volume definitions
volumes:
  redis-data:
```

### Section 3.2: Securely Managing Environment Variables and Secrets

Hardcoding credentials in configuration files is a major security risk. Kamal provides a robust mechanism for managing secrets separately from the main configuration.

#### Enhanced .kamal/secrets Configuration

```bash
# .kamal/secrets
KAMAL_REGISTRY_PASSWORD=your_docker_registry_password
RAILS_MASTER_KEY=your_rails_master_key
POSTGRES_PASSWORD=very_strong_postgres_password

# Database connection using private IP
DATABASE_URL=postgresql://rails_app:very_strong_postgres_password@10.0.0.20:5432/rails_production

# Redis connection using private IP
REDIS_URL=redis://10.0.0.30:6379/0
```

**Important**: Add `.kamal/secrets` to your `.gitignore` file to prevent it from being committed to version control.

## Part 4: Public Traffic Management and End-to-End Encryption

This section details how to securely expose the application to the internet, manage traffic, and ensure a fully encrypted connection from the end-user's browser to the application servers.

### Section 4.1: Configuring the Hetzner Load Balancer

The Hetzner Load Balancer will distribute incoming traffic across the two application servers and perform health checks to automatically remove unhealthy instances from rotation.

#### Creating and Configuring the Load Balancer

1. **Create Load Balancer**: In the Hetzner Cloud Console, navigate to "Load Balancers" and click "Create Load Balancer":
   - **Location**: Choose the same location as your servers
   - **Network**: Select the `production-network` (allows private IP communication)
   - **Type**: Choose LB11 for basic usage

2. **Add Private IP Targets**: In the Load Balancer's settings, go to "Targets" tab:
   - Select "IP" tab
   - Add private IP addresses: `10.0.0.10` and `10.0.0.11`

3. **Configure HTTPS Service**: Go to "Services" tab and click "Add service":
   - **Protocol**: HTTPS
   - **Listen Port**: 443
   - **Destination Port**: 3000
   - **Health Check**:
     - Protocol: HTTP
     - Port: 3000
     - Interval: 15s
     - Timeout: 10s
     - Retries: 3
     - HTTP Path: `/up`
     - Status Codes: ["200"]

### Section 4.2: Integrating CloudFlare for SSL and CDN with Origin Certificates

Using CloudFlare provides DDoS protection, CDN, and SSL management. For maximum security, use CloudFlare's "Full (Strict)" SSL mode with Origin Certificates.

#### Generate and Upload CloudFlare Origin Certificate

1. **In CloudFlare Dashboard**:
   - Go to SSL/TLS → Origin Server
   - Click "Create Certificate"
   - Keep default settings and generate certificate
   - Copy both the certificate and private key

2. **Upload to Hetzner Load Balancer**:
   - In Hetzner Cloud Console: Load Balancers → your-lb → Services
   - Edit your HTTPS service
   - Under Certificates → Add certificate → Upload certificate
   - Paste the CloudFlare origin certificate and private key

3. **Configure CloudFlare Settings**:
   - **DNS Records**:
     ```
     Type: A
     Name: yourdomain.com
     Content: LOAD_BALANCER_PUBLIC_IP
     Proxy: Enabled (orange cloud)
     ```
   - **SSL/TLS Settings**:
     - Set encryption mode to "Full (strict)"
     - Enable "Always Use HTTPS"
     - Enable "HTTP Strict Transport Security (HSTS)"

This ensures end-to-end encryption: Browser ↔ CloudFlare ↔ Hetzner LB ↔ App Servers

## Part 5: Building and Deploying the Staging Environment

A staging environment is crucial for testing changes before they reach production. This architecture provides a simplified, cost-effective single-server setup for this purpose.

### Section 5.1: Simplified Single-Server Staging Setup

The staging environment runs all services (Rails app, Sidekiq, PostgreSQL, Redis) on a single server.

#### Create Staging Server

```bash
# Create staging server with public IP
hcloud server create \
  --name staging-server \
  --type cx32 \
  --image ubuntu-24.04 \
  --ssh-key rails-production \
  --location fsn1

# Create and apply staging firewall
hcloud firewall create --name staging-firewall
hcloud firewall add-rule staging-firewall \
  --direction in --protocol tcp --port 22 \
  --source-ips YOUR_IP/32
hcloud firewall add-rule staging-firewall \
  --direction in --protocol tcp --port 80
hcloud firewall add-rule staging-firewall \
  --direction in --protocol tcp --port 443
hcloud firewall apply-to-resource staging-firewall --type server --server staging-server
```

### Section 5.2: Leveraging Kamal Destinations

Kamal's destinations feature allows you to manage multiple environments from the same codebase by merging a base configuration with an environment-specific override file.

#### Creating config/deploy.staging.yml

```yaml
# config/deploy.staging.yml
service: myapp-staging
image: username/myapp-staging

# All services run on single staging server
servers:
  web:
    hosts:
      - STAGING_SERVER_PUBLIC_IP
  job:
    hosts:
      - STAGING_SERVER_PUBLIC_IP
    cmd: bundle exec sidekiq -e staging

# Accessories co-located on same server
accessories:
  db:
    image: postgres:16
    host: STAGING_SERVER_PUBLIC_IP
    port: 5432
    env:
      clear:
        POSTGRES_USER: myapp_staging
        POSTGRES_DB: myapp_staging
      secret:
        - POSTGRES_PASSWORD
    volumes:
      - staging-db-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    host: STAGING_SERVER_PUBLIC_IP
    port: 6379
    volumes:
      - staging-redis-data:/data

# Automatic SSL with Let's Encrypt
proxy:
  ssl: true  # Kamal handles Let's Encrypt automatically
  host: staging.yourdomain.com
  healthcheck:
    path: /up

# Staging-specific environment
env:
  clear:
    RAILS_ENV: staging
    RAILS_SERVE_STATIC_FILES: true
    RAILS_LOG_TO_STDOUT: true
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL
    - REDIS_URL
    - POSTGRES_PASSWORD

volumes:
  staging-db-data:
  staging-redis-data:
```

#### Staging Secrets Configuration

Create `.kamal/secrets.staging`:

```bash
# .kamal/secrets.staging
KAMAL_REGISTRY_PASSWORD=your_docker_registry_password
RAILS_MASTER_KEY=staging_rails_master_key
POSTGRES_PASSWORD=staging_postgres_password

# Local connections on staging server
DATABASE_URL=postgresql://myapp_staging:staging_postgres_password@STAGING_SERVER_PUBLIC_IP:5432/myapp_staging
REDIS_URL=redis://STAGING_SERVER_PUBLIC_IP:6379/1
```

#### Staging Deployment Workflow

```bash
# Initial staging setup
kamal setup -d staging

# Deploy updates to staging
kamal deploy -d staging

# View staging logs
kamal app logs -d staging --follow
```

## Part 6: Backup Strategy

A comprehensive backup strategy is critical for data protection and disaster recovery.

### Section 6.1: Automated Database Backup with pgBackRest

pgBackRest provides enterprise-grade backup and recovery capabilities for PostgreSQL.

#### Install and Configure pgBackRest

**On the PostgreSQL primary server:**

```bash
ssh db-primary << 'EOF'
# Install pgBackRest
sudo apt install pgbackrest -y

# Configure pgBackRest
sudo cat > /etc/pgbackrest/pgbackrest.conf << 'PGBR'
[global]
repo1-type=s3
repo1-s3-endpoint=your-region.your-objectstorage.com
repo1-s3-bucket=myapp-postgres-backups
repo1-s3-region=eu-central-1
repo1-s3-key=YOUR_HETZNER_ACCESS_KEY
repo1-s3-key-secret=YOUR_HETZNER_SECRET_KEY
repo1-retention-full=7

[main]
pg1-path=/var/lib/postgresql/data
PGBR

# Create backup schedule
sudo cat > /etc/cron.d/pgbackrest << 'CRON'
# Full backup weekly on Sunday
0 2 * * 0 postgres pgbackrest --stanza=main backup --type=full

# Incremental backup daily
0 2 * * 1-6 postgres pgbackrest --stanza=main backup --type=incr
CRON

# Initialize stanza and perform initial backup
sudo -u postgres pgbackrest --stanza=main stanza-create
sudo -u postgres pgbackrest --stanza=main backup --type=full
EOF
```

#### Simple Database Backup Script (Alternative)

If you prefer a simpler approach without S3:

```bash
# Create backup script on bastion server
ssh hetzner-bastion << 'EOF'
sudo cat > /opt/backup-postgres.sh << 'BACKUP'
#!/bin/bash
set -e

DB_NAME="rails_production"
DB_USER="rails_app"
BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create SQL dump from primary database
kamal accessory exec db pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

# Clean old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
BACKUP

sudo chmod +x /opt/backup-postgres.sh

# Schedule daily backups
echo "0 3 * * * root /opt/backup-postgres.sh" | sudo tee -a /etc/crontab
EOF
```

### Section 6.2: Application and Volume Backups

#### Volume Snapshots

Hetzner Cloud provides automated volume snapshots:

```bash
# Create snapshot schedule for database volumes
hcloud volume enable-protection postgres-primary-data delete
hcloud volume enable-protection postgres-replica-data delete

# Manual snapshot creation
hcloud volume create-snapshot postgres-primary-data --description "Manual backup $(date)"
```

#### Application Code and Configuration Backup

```bash
# Backup Kamal configurations and secrets (run locally)
#!/bin/bash
# backup-configs.sh

BACKUP_DIR="./backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup Kamal configurations
cp -r config/deploy* "$BACKUP_DIR/"
cp -r .kamal/ "$BACKUP_DIR/"

# Exclude secrets from version control but include in backup
tar -czf "$BACKUP_DIR/kamal-config-$(date +%Y%m%d).tar.gz" \
    config/deploy* .kamal/

echo "Configuration backup created in $BACKUP_DIR"
```

## Part 7: Monitoring and Observability

A comprehensive monitoring strategy is essential for maintaining a healthy production system.

### Section 7.1: Monitoring Stack with Prometheus and Grafana

Deploy a monitoring stack on the bastion server:

```bash
# Create monitoring setup on bastion
ssh hetzner-bastion << 'EOF'
# Create monitoring directory
sudo mkdir -p /opt/monitoring
cd /opt/monitoring

# Install Docker if not already installed
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh

# Create docker-compose.yml for monitoring
sudo cat > docker-compose.yml << 'COMPOSE'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=strong_admin_password_here
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  postgres_exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://rails_app:password@10.0.0.20:5432/rails_production?sslmode=disable"
    ports:
      - "9187:9187"
    restart: unless-stopped

  node_exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
COMPOSE

# Create Prometheus configuration
sudo cat > prometheus.yml << 'PROM'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
    scrape_interval: 30s

  - job_name: 'node-exporter-bastion'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'rails-apps'
    static_configs:
      - targets: ['10.0.0.10:9394', '10.0.0.11:9394']
    scrape_interval: 30s
    metrics_path: '/metrics'

rule_files:
  # Add alerting rules here if needed

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # Add alertmanager targets here if needed
PROM

# Start monitoring stack
sudo docker-compose up -d

echo "Monitoring stack started!"
echo "Prometheus: http://BASTION_IP:9090"
echo "Grafana: http://BASTION_IP:3001 (admin/strong_admin_password_here)"
EOF
```

### Section 7.2: Application-Level Monitoring

Add monitoring to your Rails application:

#### Add Metrics Gems to Gemfile

```ruby
# Gemfile
gem 'prometheus-client'
gem 'yabeda-rails'
gem 'yabeda-prometheus'
gem 'yabeda-sidekiq'
```

#### Configure Application Metrics

```ruby
# config/initializers/yabeda.rb
require 'yabeda/prometheus'

Yabeda.configure do
  group :rails do
    counter :requests_total, comment: 'Total requests count', tags: [:method, :status, :controller, :action]
    histogram :request_duration, comment: 'Request duration', tags: [:method, :controller, :action], buckets: [0.1, 0.5, 1, 2.5, 5, 10]
  end

  group :database do
    histogram :query_duration, comment: 'Database query duration', tags: [:adapter], buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
  end
end

# Expose metrics endpoint
Rails.application.routes.draw do
  get '/metrics', to: proc { |env| [200, {'Content-Type' => 'text/plain'}, [Yabeda::Prometheus::Exporter.to_s]] }
end
```

### Section 7.3: Log Management

Configure centralized logging:

```bash
# Install log aggregation on bastion
ssh hetzner-bastion << 'EOF'
# Add to monitoring docker-compose.yml
sudo cat >> /opt/monitoring/docker-compose.yml << 'LOGGING'

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped

volumes:
  loki_data:
LOGGING

# Create Promtail configuration
sudo cat > /opt/monitoring/promtail-config.yml << 'PROMTAIL'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*log
    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|]*))\|
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output

  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log
PROMTAIL

# Restart with logging
sudo docker-compose up -d
EOF
```

## Part 8: Performance Optimization and Maintenance

### Section 8.1: Database Performance Optimization

Create database maintenance scripts:

```bash
# Database optimization script on bastion
ssh hetzner-bastion << 'EOF'
sudo cat > /opt/db-optimize.sh << 'DBOPT'
#!/bin/bash
# Database maintenance tasks

echo "Starting database optimization..."

# Connect to primary database and run maintenance
kamal accessory exec db -i << 'DBSQL'
# Update table statistics
psql -U postgres -d rails_production -c "ANALYZE;"

# Check for bloated tables
psql -U postgres -d rails_production -c "
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    ROUND((n_dead_tup * 100.0) / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_percentage DESC;"

# Show database size
psql -U postgres -d rails_production -c "
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database;"

# Show largest tables
psql -U postgres -d rails_production -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"
DBSQL

echo "Database optimization completed!"
DBOPT

sudo chmod +x /opt/db-optimize.sh

# Schedule weekly database optimization
echo "0 3 * * 0 root /opt/db-optimize.sh" | sudo tee -a /etc/crontab
EOF
```

### Section 8.2: Security Maintenance and Updates

Create automated security update script:

```bash
# Security update script for all servers
cat > /opt/security-updates.sh << 'SECURITY'
#!/bin/bash
# Update all servers in the infrastructure

SERVERS=(
    "hetzner-bastion"
    "app-01"
    "app-02"
    "db-primary"
    "db-replica"
    "sidekiq-01"
)

for server in "${SERVERS[@]}"; do
    echo "Updating $server..."
    ssh "$server" << 'EOF'
        sudo apt update
        sudo apt upgrade -y
        sudo apt autoremove -y
        sudo apt autoclean

        # Check for reboot requirement
        if [ -f /var/run/reboot-required ]; then
            echo "REBOOT REQUIRED for $(hostname)"
        fi
EOF
done

echo "Security updates completed for all servers!"
SECURITY

chmod +x /opt/security-updates.sh

# Schedule monthly security updates
echo "0 4 1 * * root /opt/security-updates.sh" >> /etc/crontab
```

### Section 8.3: Performance Monitoring Scripts

```bash
# System performance monitoring script
cat > /opt/performance-check.sh << 'PERF'
#!/bin/bash
# Check performance across all servers

SERVERS=(
    "hetzner-bastion:Bastion"
    "app-01:App Server 1"
    "app-02:App Server 2"
    "db-primary:Database Primary"
    "db-replica:Database Replica"
    "sidekiq-01:Sidekiq Worker"
)

echo "=== Performance Report $(date) ==="

for server_info in "${SERVERS[@]}"; do
    server=$(echo "$server_info" | cut -d: -f1)
    name=$(echo "$server_info" | cut -d: -f2)

    echo "
--- $name ($server) ---"

    ssh "$server" << 'EOF'
        # CPU and Memory usage
        echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')"
        echo "Memory Usage: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
        echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
        echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"

        # Docker container status if applicable
        if command -v docker &> /dev/null; then
            echo "Docker Containers:"
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers running"
        fi
EOF
done

echo "
=== End Performance Report ==="
PERF

chmod +x /opt/performance-check.sh
```

## Part 9: Deployment and Operations

### Section 9.1: Complete Kamal Deployment Commands

```bash
# Production deployment workflow

# Initial setup (first time only)
kamal setup

# Regular deployments
kamal deploy

# Check application status
kamal app details

# View logs
kamal app logs --follow

# Execute Rails console
kamal app exec --interactive --reuse 'bin/rails console'

# Database migrations
kamal app exec 'bin/rails db:migrate'

# Restart specific services
kamal accessory reboot redis
kamal accessory reboot db

# Scale web servers (if adding more)
# Update config/deploy.yml with new server IPs, then:
kamal deploy

# Rollback deployment
kamal deploy --version=VERSION_NUMBER

# Check deployment history
kamal app version
```

### Section 9.2: Troubleshooting Common Issues

#### Database Connection Issues

```bash
# Test database connectivity
kamal app exec 'bin/rails runner "puts ActiveRecord::Base.connection.execute(\"SELECT 1\")"'

# Check database logs
kamal accessory logs db --follow

# Test from app server directly
ssh app-01 'nc -zv 10.0.0.20 5432'
```

#### Application Performance Issues

```bash
# Check application logs
kamal app logs --follow --grep "ERROR"

# Monitor resource usage
kamal app exec 'ps aux | head -20'

# Check container stats
ssh app-01 'docker stats'
```

#### Network Connectivity Issues

```bash
# Test bastion connectivity
ssh hetzner-bastion 'ping -c 3 google.com'

# Test internal connectivity
ssh app-01 'ping -c 3 10.0.0.20'  # Test DB connection

# Check firewall rules
ssh app-01 'sudo ufw status verbose'

# Test load balancer health checks
curl -I http://YOUR_DOMAIN/up
```

## Conclusion

This comprehensive guide provides a production-ready Rails architecture on Hetzner Cloud that achieves:

**Robust Security:**
- Fully private network with single bastion entry point
- Multi-layered firewall protection (perimeter + host-based)
- End-to-end encryption with CloudFlare Origin Certificates
- Non-root user access and key-based authentication

**High Availability:**
- Load-balanced application servers
- PostgreSQL streaming replication
- Automated health checks and failover

**Operational Excellence:**
- Container-based deployment with Kamal
- Comprehensive monitoring and alerting
- Automated backups and maintenance
- Performance optimization scripts

**Cost Effectiveness:**
- Approximately €153/month for full production setup
- Single staging server for development/testing
- Efficient resource utilization

**Scalability:**
- Horizontal scaling by adding servers to load balancer
- Persistent storage decoupled from compute
- Clear separation of concerns between services

The architecture provides enterprise-grade capabilities at a fraction of the cost of major cloud providers, with the operational simplicity that Kamal brings to deployment and management.

For ongoing maintenance, follow the monitoring dashboards, run the performance and security scripts regularly, and keep the documentation updated as your infrastructure evolves.
