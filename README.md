# 🚀 RMM Analytics - Installation & Usage Guide

A comprehensive analytics platform for RMM (Real Money Market) protocol, providing detailed insights into your DeFi positions, interest calculations, and transaction history.

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Git**

## 🏗️ Project Structure

```
rmmgain/
├── frontend/          # Next.js React application
├── backend/           # Express.js API server
├── components/        # React components
├── utils/            # Utility functions and constants
└── docs/             # Documentation
```

## 🚀 Quick Start

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd rmmgain
```

### Step 2: Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Step 3: Environment Configuration

#### Frontend Environment (.env)
Create a `.env` file in the root directory:

```bash
# Frontend Environment Variables
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GNOSISSCAN_API_KEY=your_gnosisscan_api_key_here
NEXT_PUBLIC_THEGRAPH_API_URL=https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg
```

#### Backend Environment (.env)
Create a `.env` file in the `backend/` directory:

```bash
# Backend Environment Variables
PORT=5000
NODE_ENV=development
THEGRAPH_API_KEY=your_thegraph_api_key_here
GNOSISSCAN_API_KEY=your_gnosisscan_api_key_here
GNOSIS_RPC_URL=https://rpc.gnosischain.com/
CORS_ORIGIN=http://localhost:3000
```

### Step 4: API Keys Setup

#### GnosisScan API Key (Required)
1. Go to [https://gnosisscan.io/](https://gnosisscan.io/)
2. Create a free account
3. Navigate to "API-KEYs" in your profile
4. Create a new API key
5. Add it to both `.env` files

#### TheGraph API Key (Recommended)
1. Go to [https://thegraph.com/](https://thegraph.com/)
2. Create an account
3. Navigate to "API Keys"
4. Create a new API key
5. Add it to the backend `.env` file

## 🎯 Running the Application

### Development Mode

#### Start Backend Server
```bash
cd backend
npm run dev
```
The backend will start on `http://localhost:5000`

#### Start Frontend Application
```bash
# In a new terminal, from the root directory
npm run dev
```
The frontend will start on `http://localhost:3000`

### Production Mode

#### Build Frontend
```bash
npm run build
npm start
```

#### Start Backend
```bash
cd backend
npm start
```

## 🛑 Stopping the Application

### Stop Frontend
```bash
# Press Ctrl+C in the frontend terminal
```

### Stop Backend
```bash
# Press Ctrl+C in the backend terminal
```

## 🔄 Restarting the Application

### Restart Frontend
```bash
# Stop with Ctrl+C, then restart
npm run dev
```

### Restart Backend
```bash
cd backend
# Stop with Ctrl+C, then restart
npm run dev
```

### Restart Both
```bash
# Stop both processes with Ctrl+C
# Then restart in separate terminals:
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
npm run dev
```

## 📊 Available Scripts

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend Scripts
```bash
cd backend
npm run dev              # Start with nodemon (auto-restart)
npm start                # Start production server
npm run test-env         # Test environment variables
npm run test-balances    # Test balance API performance
```

## 🌐 API Endpoints

### Main Endpoints
- **Health Check**: `GET /`
- **RMM V2**: `GET /api/rmm/v2/:address`
- **RMM V3**: `GET /api/rmm/v3/:address`

### Example Usage
```bash
# Test the API
curl http://localhost:5000/api/rmm/v3/0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :5000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Environment Variables Not Loading
```bash
# Verify .env files exist
ls -la .env
ls -la backend/.env

# Check if variables are loaded
echo $NEXT_PUBLIC_BACKEND_URL
```

#### API Key Errors
```bash
# Verify API keys in .env files
cat .env | grep API_KEY
cat backend/.env | grep API_KEY
```

#### Dependencies Issues
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Performance Issues

#### Rate Limiting
- GnosisScan: 5 calls/second (free), 100 calls/second (paid)
- TheGraph: 1000 calls/day (free), custom limits (paid)

#### Memory Issues
```bash
# Check Node.js memory usage
node --max-old-space-size=4096 server.js
```

## 📱 Using the Application

1. **Open your browser** and navigate to `http://localhost:3000`
2. **Enter an EVM address** (e.g., `0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f`)
3. **Click "Analyze"** to view your RMM data
4. **Explore the dashboard** with charts, transactions, and financial summaries

## 🏗️ Development

### Adding New Features
1. Frontend components go in `components/`
2. Backend routes go in `backend/routes/`
3. Utility functions go in `utils/`
4. Update types in `types/`

### Code Style
- Frontend: TypeScript + React hooks
- Backend: ES6+ JavaScript + Express
- Styling: TailwindCSS
- Charts: Chart.js + React-Chartjs-2

## 📚 Additional Resources

- **RMM Protocol**: [https://rmm.xyz/](https://rmm.xyz/)
- **Gnosis Chain**: [https://gnosischain.com/](https://gnosischain.com/)
- **TheGraph**: [https://thegraph.com/](https://thegraph.com/)
- **GnosisScan**: [https://gnosisscan.io/](https://gnosisscan.io/)

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Check the console for error messages

## 📄 License

This project is licensed under the MIT License.

---

**Happy analyzing! 🚀📊**
