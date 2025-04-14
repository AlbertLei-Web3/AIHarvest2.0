# AIHarvest 2.0 CI/CD Workflow

The following diagram illustrates the CI/CD workflow for the AIHarvest 2.0 project:

```mermaid
graph TD
    subgraph "Development"
        A[Developer] -->|Push to GitHub| B[GitHub Repository]
    end

    subgraph "Continuous Integration"
        B -->|Push to develop/PR to main| C[GitHub Actions: CI Workflow]
        C --> C1[Lint Contracts]
        C --> C2[Test Contracts]
        C --> C3[Build Frontend]
        C --> C4[Test Backend]
    end

    subgraph "Continuous Deployment"
        B -->|Push to main| D[GitHub Actions: CD Workflow]
        D --> D1[Build and Push Backend Docker Image]
        D --> D2[Deploy Frontend to Vercel]
        D --> D3[Deploy Smart Contracts to Testnet]
        
        D1 --> E1[DockerHub Registry]
        E1 --> F1[Deploy Backend to Production Server]
        
        D2 --> F2[Vercel Frontend Hosting]
        
        D3 --> F3[Ethereum Testnet]
        F3 --> G[Deploy Subgraph]
    end

    subgraph "Production Environment"
        F1 --> H[Production Backend API]
        F2 --> I[Production Frontend App]
        G --> J[The Graph API]
        J --> I
        H --> I
    end
```

## CI/CD Process Flow

1. **Development**:
   - Developers work on feature branches
   - Push changes to GitHub repository

2. **Continuous Integration**:
   - Triggered on push to develop branch or PR to main
   - Runs linting, tests, and builds for all components
   - Ensures code quality and functionality

3. **Continuous Deployment**:
   - Triggered only on push to main branch
   - Builds and publishes Docker images
   - Deploys frontend to Vercel
   - Deploys contracts to testnet (if enabled)
   - Updates subgraph indexing

4. **Production Environment**:
   - Frontend hosted on Vercel
   - Backend running in Docker containers on cloud servers
   - Smart contracts deployed on Ethereum network
   - Subgraph indexing data on The Graph protocol

## Manual Deployment

In some cases, manual deployment may be preferred:

```mermaid
sequenceDiagram
    actor Developer
    participant Script as Deploy Script
    participant Backend as Backend Services
    participant Frontend as Frontend App
    participant Blockchain as Ethereum Network
    participant Subgraph as The Graph
    
    Developer->>Script: Run deploy-prod.sh
    Script->>Backend: Build & Deploy Backend Containers
    Script->>Frontend: Build & Deploy Frontend
    Script->>Blockchain: Deploy Smart Contracts
    Blockchain-->>Script: Return Contract Addresses
    Script->>Subgraph: Update & Deploy Subgraph
    Script-->>Developer: Deployment Complete
``` 