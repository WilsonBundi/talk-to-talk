# Architecture Overview

This application is designed using a cloud-native, modular architecture suitable for a postgraduate-level assessment.

## Components

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Storage: Azure Blob Storage
- Authentication: Azure Active Directory / MSAL
- Caching: Optional Redis
- CI/CD: GitHub Actions

## Data flow

1. User authenticates via Azure AD in the frontend using MSAL.
2. Frontend attaches an Azure access token to every backend request.
3. Backend verifies the token using Azure JWT validation and resolves user role from MongoDB.
4. Creators request an upload URL from the backend.
5. Frontend uploads media files directly to Azure Blob Storage using a SAS token.
6. Frontend sends metadata to the backend to create a media record.
7. Consumers browse/search media through the backend API.
8. Comments and ratings are stored in MongoDB with references to media objects.

## Scalability decisions

- Backend is stateless: all state is stored in managed services (MongoDB, Azure Blob Storage, Redis).
- Uploaded media is separated from metadata storage to optimize horizontal scaling.
- The backend uses RESTful services and can be scaled behind Azure App Service with autoscaling.
- MongoDB text search indexes and timestamp indexes support scalable query performance.
- Redis caching reduces repeated database queries for popular feed and search results.

## Limitations and future improvements

- Media delivery can be improved by adding Azure CDN in front of Blob Storage.
- User profile and role management currently uses Azure AD access tokens plus a MongoDB role mapping; custom claims could tighten this further.
- The frontend uses in-browser image compression only for images; video compression remains unoptimized.
- Production deployment should include HTTPS enforcement, rate limiting, and more extensive integration tests.
