# Discord Clone

## Overview

This is a full-stack Discord clone built with a modern web architecture. The application allows users to create and join servers, participate in text channels, and engage in real-time chat conversations. It features a Discord-like UI with server lists, channel sidebars, and chat areas, providing an authentic messaging experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Component-based UI using React 18 with TypeScript for type safety
- **Routing**: Client-side routing implemented with Wouter for lightweight navigation
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Styling**: Custom Discord theme using CSS variables and Tailwind utility classes
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Express.js Server**: Node.js backend with Express handling API routes and middleware
- **Authentication**: Replit Authentication with OpenID Connect integration and session management
- **Real-time Communication**: Server-Sent Events (SSE) for real-time message delivery
- **File Upload**: Multer middleware for handling image uploads with file size limits
- **API Design**: RESTful endpoints with structured error handling and logging

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection Pooling**: Neon serverless PostgreSQL with connection pooling
- **Schema Design**: Relational database with tables for users, servers, channels, messages, and server memberships
- **Migration System**: Drizzle migrations for database schema versioning

### Key Features
- **Server Management**: Users can create servers and join existing ones
- **Channel System**: Text and voice channels within servers (voice functionality planned)
- **Real-time Messaging**: Live chat updates using Server-Sent Events
- **Image Sharing**: Support for image uploads in messages
- **Session Management**: Persistent user sessions with PostgreSQL session store
- **Responsive Design**: Mobile-friendly interface with Discord-inspired theming

### Security & Performance
- **Authentication**: Secure session-based authentication with Replit OAuth
- **File Validation**: Image-only uploads with size restrictions
- **CORS & Security**: Proper middleware configuration for security headers
- **Caching Strategy**: Query caching with TanStack Query for optimal performance
- **Database Indexing**: Optimized queries with proper indexing on foreign keys

## External Dependencies

### Database & Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database toolkit with migration support

### Authentication
- **Replit Authentication**: OpenID Connect integration for user authentication
- **Session Management**: PostgreSQL-backed session storage with connect-pg-simple

### UI & Styling
- **Radix UI**: Headless UI components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide Icons**: Icon library for consistent iconography

### Development Tools
- **Vite**: Build tool with HMR and optimized bundling
- **TypeScript**: Type checking and development experience
- **ESBuild**: Fast JavaScript bundler for production builds

### Real-time Features
- **Server-Sent Events**: Native browser API for real-time message delivery
- **TanStack Query**: Data synchronization and caching for real-time updates

### File Handling
- **Multer**: Multipart form data handling for file uploads
- **File System**: Local file storage for uploaded images