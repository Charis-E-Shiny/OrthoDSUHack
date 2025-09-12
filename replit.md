# Overview

This is a knee rehabilitation monitoring system that combines Arduino sensor data collection with AI-powered analysis through n8n workflow automation. The application provides real-time monitoring of knee exercises, tracks patient progress, and delivers personalized rehabilitation recommendations. It features a React frontend dashboard for healthcare providers and patients to visualize exercise data, monitor progress, and receive AI-generated guidance for optimal recovery.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Components**: Shadcn/UI component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js for real-time data visualization
- **Real-time Communication**: WebSocket connection for live Arduino data streaming

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints with WebSocket support for real-time features
- **Session Management**: Express sessions with PostgreSQL session store
- **Data Validation**: Zod schemas for type-safe data validation
- **Build System**: ESBuild for production bundling

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Fallback Storage**: In-memory storage implementation for development/testing
- **Data Models**: Users, sensor readings, sessions, recommendations, and serial port configurations

## Hardware Integration
- **Serial Communication**: Node.js SerialPort library for Arduino connectivity
- **Data Protocol**: JSON-based sensor data transmission over USB/serial
- **Sensor Types**: Accelerometer, gyroscope, and temperature sensors
- **Exercise Classification**: Support for flexion, extension, and lateral knee movements
- **Real-time Processing**: Live angle calculations and movement analysis

## AI and Workflow Integration
- **Automation Platform**: n8n for AI-powered recommendation workflows
- **Data Pipeline**: Automatic sensor data forwarding to n8n webhooks
- **Machine Learning**: AI analysis of movement patterns and progress tracking
- **Recommendation Engine**: Personalized exercise suggestions based on performance data
- **Progress Monitoring**: Quality scoring and improvement tracking over time

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database for production data storage
- **Development Tools**: Replit integration for cloud-based development environment
- **Build Pipeline**: Vite development server with hot module replacement

## Hardware Communication
- **Arduino Integration**: SerialPort library for USB/serial device communication
- **Sensor Data Processing**: Custom parsing for accelerometer and gyroscope readings
- **Device Management**: Automatic port detection and connection status monitoring

## AI and Analytics
- **n8n Workflows**: External automation platform for AI-powered analysis
- **Webhook Integration**: Real-time data streaming to n8n for processing
- **Recommendation APIs**: AI-generated exercise suggestions and progress insights

## UI and Visualization
- **Shadcn/UI**: Comprehensive component library with accessibility features
- **Radix UI**: Primitive components for complex interactions
- **Chart.js**: Real-time data visualization for sensor readings and progress tracking
- **Lucide Icons**: Consistent iconography throughout the application

## Development and Deployment
- **TypeScript**: Full-stack type safety with shared schema definitions
- **ESLint and Prettier**: Code quality and formatting standards
- **Replit Deployment**: Integrated hosting and development environment
- **Environment Configuration**: Secure environment variable management for database and API credentials