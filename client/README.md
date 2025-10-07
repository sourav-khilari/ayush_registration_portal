# AYUSH Startup Registration Portal - Frontend

A modern, responsive landing page for the AYUSH (Ayurveda, Yoga, Unani, Siddha, and Homeopathy) startup registration portal built with React and Tailwind CSS.

## Features

- **Modern Design**: Clean, professional design with AYUSH branding
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Components**: Smooth animations and hover effects
- **Accessibility**: Built with accessibility best practices
- **Performance**: Optimized for fast loading and smooth user experience

## Sections

1. **Navigation Bar**: Sticky navigation with logo and menu items
2. **Hero Section**: Eye-catching introduction with call-to-action buttons
3. **Features Section**: Key benefits of using the AYUSH portal
4. **About Section**: Information about the portal and statistics
5. **Services Section**: Detailed service offerings
6. **Testimonials**: Customer reviews and feedback
7. **Call-to-Action**: Registration prompt
8. **Footer**: Contact information and links

## Technologies Used

- **React 19**: Latest version of React
- **Tailwind CSS**: Utility-first CSS framework
- **React Icons**: Beautiful icons from Font Awesome
- **Vite**: Fast build tool and development server

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Customization

### Colors

The project uses a custom AYUSH color palette defined in `tailwind.config.js`:

- **Primary Green**: `#22c55e` (ayush-500)
- **Light Green**: `#f0fdf4` (ayush-50)
- **Dark Green**: `#14532d` (ayush-900)

### Fonts

The project uses Inter font family for a modern, clean look.

### Components

All components are built with Tailwind CSS utility classes for easy customization.

## Project Structure

```
client/
├── public/
│   ├── ayush_banner.jpeg
│   └── vite.svg
├── src/
│   ├── App.jsx          # Main application component
│   ├── App.css          # Custom styles (minimal)
│   ├── index.css        # Tailwind CSS imports and base styles
│   ├── main.jsx         # Application entry point
│   └── assets/
│       └── react.svg
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── vite.config.js       # Vite configuration
```

## Deployment

To build for production:

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the AYUSH Startup Registration Portal initiative.