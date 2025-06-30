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
10.0.0.2  - Bastion/NAT Gateway
10.0.0.3  - App Server 1
10.0.0.4  - App Server 2
10.0.0.5  - Jobs Server (Solid Queue)
10.0.0.6  - PostgreSQL Primary
10.0.0.7  - PostgreSQL Replica
10.0.0.8  - Monitoring Server
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

# Detect the primary public interface (alternative to hardcoding eth0)
PUBLIC_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
echo "Detected public interface: $PUBLIC_INTERFACE"

# This rule translates private IPs to the bastion's public IP
sudo iptables -t nat -A POSTROUTING -s '10.0.0.0/16' -o $PUBLIC_INTERFACE -j MASQUERADE

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

# ------------------------------
# 5. Test NAT Functionality
# ------------------------------

# Test from bastion itself - get public IPv4 address
curl -4 -s https://ifconfig.me
# Should return your bastion's public IPv4

# Alternative services for IPv4
# curl -s https://checkip.amazonaws.com
# curl -s https://ipinfo.io/ip
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

### Step 3.1: Create Application Servers

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
- **SSH Key**: Add your SSH key

**App Server 2:**
- **Name**: `app-02`
- **Same configuration as App Server 1**

These servers will run our Rails application

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

> ⚠️ **Temporary Issue with Hetzner Volumes**
> As of June 2025, unfortunately, in the Hetzner UI, I cannot create a volume at the moment because of a bug there, when I try to create a volume with 100GB it says volumen cannot be larger than 4GB, and when I try to create a volume with 4GB it says volume cannot be smaller than 10GB. But I'll update this section when the bug is fixed.


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

# Step 7: Configure Private Server Internet Access

After creating each private server, we need to configure them to access the internet through our bastion NAT gateway.

But before that we need to be able to connect to our servers, and it's not possible to do it simply by using
`ssh root@YOUR_SERVER_PUBLIC_IP` because our servers have no public IP. look at them:

![servers-final-list](servers-final-list.png){: .normal}

only bastion server has a public IP, so we must connect to the others through the bastion server. To do this we need some configs in our ssh local machine.

### Step 7.1: Configure SSH Access

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

Now we can connect to each server from our local machine by just typing `ssh <server-name>` in terminal:

e.g:

```bash
ssh app-01
```


### Step 7.2: Configure Routing and DNS

Connect to each app server and configure internet access:

```bash
ssh app-01
```

Then run the following commands to set the default gateway to the bastion server:

```bash
# Add default route via Hetzner gateway (which routes through bastion)
sudo ip route add default via 10.0.0.1 dev enp7s0

# Configure DNS via systemd-resolved
sudo mkdir -p /etc/systemd/resolved.conf.d/
sudo tee /etc/systemd/resolved.conf.d/dns.conf << 'EOF'
[Resolve]
DNS=185.12.64.2 185.12.64.1 8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
EOF

# Restart systemd-resolved
sudo systemctl restart systemd-resolved

# Make the route persistent across reboots
echo 'ip route add default via 10.0.0.1 dev enp7s0' | sudo tee -a /etc/rc.local
sudo chmod +x /etc/rc.local

# Test internet connectivity
curl -4 -s https://ifconfig.me
# Should return your bastion's public IP (e.g., 128.140.86.71)

# Test DNS resolution
nslookup google.com
# Should return valid IP addresses
```

You must repeat this for each server with private ip we have:

  - apps (`app-01`, `app-02`)
  - jobs (`jobs-01`)
  - monitoring (`monitor-01`)

# Step 8: Hetzner Load Balancer

## Why We Need a Load Balancer

A load balancer provides:

- **Traffic Distribution**: Spreads requests across multiple app servers
- **Health Checks**: Automatically removes failed servers from rotation
- **SSL Termination**: Handles SSL/TLS encryption/decryption
- **High Availability**: Single point of entry that's managed by Hetzner

> This is what makes your application truly "production-ready" - users always get a response even if servers fail.

## How to Create the Load Balancer

### Step 8: Create Hetzner Load Balancer

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

# Step 9: CloudFlare Integration

## Why We Need CloudFlare

CloudFlare provides:

- **DDoS Protection**: Protects against malicious traffic
- **Global CDN**: Faster content delivery worldwide
- **SSL Management**: Automatic SSL certificate management
- **DNS Management**: Reliable, fast DNS resolution

This is your first line of defense and performance optimization.

## How to Configure CloudFlare

### Step 9.1: Generate CloudFlare Origin Certificate

1. **In CloudFlare Dashboard for your domain**:
   - Go to SSL/TLS → Origin Server
   - Click "Create Certificate"
   - Keep default settings and generate
   - Now you can see certificate and private key. which we will use in the next step.

![cloudflare-origin](cloudflare-origin.png){: .normal}
![cloudflare-create](cloudflare-create.png){: .normal}
![cloudflare-keys](cloudflare-keys.png){: .normal}

### Step 9.2: Upload Certificate to Load Balancer

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

### Step 9.3: Configure DNS and SSL

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

# Step 10: Firewall Configuration

## Why We Need Multi-Layered Firewalls

Firewalls provide defense-in-depth security:

- **Perimeter Defense**: Hetzner Cloud Firewalls block unwanted public traffic
- **Internal Segmentation**: Host-based firewalls enforce zero-trust between servers
- **Principle of Least Privilege**: Only allow the minimum required connections
- **Attack Surface Reduction**: Limit potential entry points for attackers

**Critical**: Hetzner Cloud Firewalls don't filter traffic between servers on the same private network, so host-based firewalls are essential.

## How to Configure Firewalls

### Step 10.1: Hetzner Cloud Firewalls (Perimeter Defense)

In the left menu, select "Firewalls" and then click "Create Firewall".

**Bastion Firewall:**
1. Create firewall: `bastion-firewall`
2. Inbound Rules:
   - Allow TCP port 22 from and IP, or from YOUR_IP/32 only
   - Allow ICMP for diagnostics
3. Apply to: bastion-server only

![firewalls-bastion-rules](firewalls-bastion-rules.png){: .normal}
![firewalls-bastion-servers](firewalls-bastion-servers.png){: .normal}


### Step 10.2: Host-Based Firewalls (Internal Segmentation)

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

# Administrative database access from bastion
sudo ufw allow from 10.0.0.2 to any port 5432 proto tcp

# HTTP access from app servers (for API calls, webhooks, etc.)
# Replace 10.0.0.03 and 10.0.0.04 with the actual private IPs of your app servers
sudo ufw allow from 10.0.0.03 to any port 5432 proto tcp
sudo ufw allow from 10.0.0.04 to any port 5432 proto tcp

# Database access from jobs server (Solid Queue operations)
# Replace 10.0.0.5 with the actual private IP of your jobs server
sudo ufw allow from 10.0.0.5 to any port 5432 proto tcp

# Replication from replica server. Replace 10.0.0.7 with the actual private IP of your replica server
sudo ufw allow from 10.0.0.7 to any port 5432 proto tcp

# Monitoring access. Replace 10.0.0.8 with the actual private IP of your monitoring server
sudo ufw allow from 10.0.0.8 to any port 9394 proto tcp

sudo ufw --force enable
```

**PostgreSQL Replica:**

We will do the same for the replica database server, but we need to allow access from primary database server for replication, and we need to allow access from monitoring server as well. And there is no income traffic from load balancer or app servers to replica server, so we don't need to allow that.
first connect to server `db-replica` by running this in your terminal:

```bash
ssh db-replica
```

Then you will be connected to the server, and run these commands there:

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install ufw -y

sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from bastion only. Replace 10.0.0.2 with the actual private IP of your bastion server
sudo ufw allow from 10.0.0.2 to any port 22 proto tcp

# Administrative database access from bastion
sudo ufw allow from 10.0.0.2 to any port 5432 proto tcp

# Replication from primary db server. Replace 10.0.0.6 with the actual private IP of your primary server
sudo ufw allow from 10.0.0.6 to any port 9394 proto tcp

# Read-only access from app servers (if configured for read scaling)
sudo ufw allow from 10.0.0.03 to any port 5432 proto tcp
sudo ufw allow from 10.0.0.04 to any port 5432 proto tcp

# Read-only access from jobs server (for reporting, analytics jobs)
sudo ufw allow from 10.0.0.5 to any port 5432 proto tcp

# Monitoring access. Replace 10.0.0.8 with the actual private IP of your monitoring server
sudo ufw allow from 10.0.0.8 to any port 9394 proto tcp

sudo ufw --force enable
```

**Monitoring Server:**

We will do the same for the monitoring server, but we need to allow access from bastion server for Prometheus and Grafana web UI, and we need to allow access from app servers for Prometheus metrics scraping.

first connect to server `monitor-01` by running this in your terminal:

```bash
ssh monitor-01
```

Then you will be connected to the server, and run these commands there:


```bash
sudo apt update && sudo apt upgrade -y

sudo apt install ufw -y

sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from bastion only. Replace 10.0.0.2 with the actual private IP of your bastion server
sudo ufw allow from 10.0.0.2 to any port 22 proto tcp

# Prometheus access from bastion (for web UI)
sudo ufw allow from 10.0.0.2 to any port 9090 proto tcp

# Grafana access from bastion (for web UI)
sudo ufw allow from 10.0.0.2 to any port 3001 proto tcp

sudo ufw --force enable
```

# Step 11: Database Cluster Setup

## Why We Configure PostgreSQL This Way

Our PostgreSQL setup provides:

- **Persistent Storage**: Data survives server failures
- **Streaming Replication**: Near real-time backup with automatic failover capability
- **Kamal Integration**: Database lifecycle managed consistently with apps
- **Performance Optimization**: Tuned for Rails workloads

## How to Setup PostgreSQL with Replication

### Step 11.1: Prepare Storage Volumes

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

### Step 11.2: Install Docker on All Servers

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

### Step 11.3: Configure Kamal for PostgreSQL

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
      - 10.0.0.3  # app-01
      - 10.0.0.4  # app-02
    options:
      memory: 2g
      cpus: 2
  job:
    hosts:
      - 10.0.0.5  # jobs-01
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
    host: 10.0.0.6  # db-primary
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
    host: 10.0.0.7  # db-replica
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

### Step 11.4: Configure Secrets

Create `.kamal/secrets`:

```bash
# .kamal/secrets
KAMAL_REGISTRY_PASSWORD=your_docker_registry_password
RAILS_MASTER_KEY=your_rails_master_key
POSTGRES_PASSWORD=very_strong_postgres_password

# Database connection using private IP
DATABASE_URL=postgresql://rails_app:very_strong_postgres_password@10.0.0.6:5432/rails_production
```

### Step 11.5: Setup PostgreSQL Primary

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
host replication replicator 10.0.0.7/32 scram-sha-256
# Application connections
host all rails_app 10.0.0.3/32 scram-sha-256
host all rails_app 10.0.0.4/32 scram-sha-256
host all rails_app 10.0.0.5/32 scram-sha-256
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

### Step 11.6: Setup PostgreSQL Replica

```bash
# Stop replica if running
kamal accessory stop db-replica

# Clear data directory on replica host
ssh db-replica 'sudo rm -rf /mnt/data/postgresql/*'

# Create base backup from primary
kamal accessory run db-replica -i << 'EOF'
export PGPASSWORD='replica_password_here'
pg_basebackup -h 10.0.0.6 -D /var/lib/postgresql/data -U replicator -v -P -R -X stream
EOF

# Start replica in standby mode
kamal accessory boot db-replica
```

# Step 12: Rails Application Configuration

## Why We Configure Rails This Way

Rails 8 with Solid components provides:

- **Solid Queue**: Database-backed job queue (no Redis needed)
- **Solid Cache**: Shared caching across app servers
- **Solid Cable**: Database-backed WebSocket connections
- **Simplified Stack**: Everything runs on PostgreSQL

## How to Configure Rails for Production

### Step 12.1: Rails Application Setup

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

### Step 12.2: Application Metrics

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

# Step 13: Monitoring Server Setup

## Why We Need Comprehensive Monitoring

Monitoring provides:

- **System Health**: Track CPU, memory, disk usage across all servers
- **Application Performance**: Monitor Rails request times, error rates
- **Database Metrics**: PostgreSQL performance and replication status
- **Business Metrics**: Track user activity, revenue, custom KPIs

## How to Setup Monitoring

### Step 13.1: Install Monitoring Stack

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
      DATA_SOURCE_NAME: "postgresql://rails_app:very_strong_postgres_password@10.0.0.6:5432/rails_production?sslmode=disable"
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
      - targets: ['10.0.0.3:9394', '10.0.0.4:9394']
    metrics_path: '/metrics'

  - job_name: 'rails-jobs'
    static_configs:
      - targets: ['10.0.0.5:9394']
    metrics_path: '/metrics'
PROM

# Start monitoring stack
docker-compose up -d
EOF
```

### Step 13.2: Access Monitoring Dashboards

You can access the monitoring tools via SSH tunneling through the bastion:

```bash
# Grafana dashboard
ssh -L 3001:10.0.0.8:3001 hetzner-bastion
# Then visit http://localhost:3001 (admin/strong_admin_password_here)

# Prometheus metrics
ssh -L 9090:10.0.0.8:9090 hetzner-bastion
# Then visit http://localhost:9090
```

# Step 14: Deployment and Operations

## How to Deploy with Kamal

### Step 14.1: Initial Deployment

```bash
# Setup servers and deploy for the first time
kamal setup

# Check deployment status
kamal app details

# View application logs
kamal app logs --follow
```

### Step 14.2: Regular Operations

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

# Step 15: Backup and Maintenance

## Automated Backup Strategy

### Step 15.1: Database Backups

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

### Step 15.2: System Maintenance

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
