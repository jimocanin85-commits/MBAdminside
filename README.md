# MBAdminside

Admin portal for Malov Club management system.

## Technologies

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn-ui** - Component library
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend as a service

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```sh
git clone https://github.com/jimocanin85-commits/MBAdminside.git
cd MBAdminside
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
   - Copy `.env` file and configure your Supabase credentials

4. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

```
├── public/          # Static assets
├── src/            # Source code
│   ├── components/ # React components
│   ├── pages/      # Page components
│   └── ...
├── supabase/       # Supabase configuration
└── ...
```

## Deployment

Build the project for production:

```sh
npm run build
```

The `dist` folder will contain the production-ready files that can be deployed to any static hosting service.
