after deploying # 🔒 NLRC Portfolio Builder - Secure Edition

An AI-powered portfolio builder with **fully secure API key management**. Your API keys are never exposed to users!

## 🛡️ Security Features

✅ **API Keys Hidden from Client** - Keys stored in `.env` file on backend  
✅ **Backend Proxy Server** - All API calls routed through secure server  
✅ **Git Protection** - `.gitignore` prevents accidental key exposure  
✅ **Environment Variables** - Industry-standard security practice  

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Your API keys are already configured in the `.env` file:
- **CODING**: For content generation and structure
- **DESIGN**: For UI improvements  
- **PLANNING/THEME**: For theme generation

> ⚠️ **IMPORTANT**: Never commit the `.env` file to version control!

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📁 Project Structure

```
NLRC AI Portfolio Builder/
├── .env                    # 🔒 API keys (NEVER commit!)
├── .gitignore             # Protects .env from git
├── server.js              # 🛡️ Secure backend server
├── package.json           # Dependencies
├── index.html             # Frontend UI
├── script.js              # Frontend logic (NO API keys!)
├── style.css              # Styling
└── README.md              # This file
```

---

## 🔑 How Security Works

### Before (❌ INSECURE):
```javascript
// API keys exposed in client-side code
const API_KEY = 'AIzaSy...'; // Anyone can see this!
fetch(`https://api.google.com?key=${API_KEY}`);
```

### After (✅ SECURE):
```javascript
// Client sends request to YOUR server
fetch('http://localhost:3000/api/gemini', {
    body: JSON.stringify({ keyType: 'CODING', prompt: '...' })
});

// Server uses hidden API key
const apiKey = process.env.GEMINI_API_KEY_CODING; // Safe!
```

---

## 🔧 Configuration

### Changing API Keys

Edit the `.env` file:
```env
GEMINI_API_KEY_CODING=your_new_key_here
GEMINI_API_KEY_DESIGN=your_new_key_here
GEMINI_API_KEY_PLANNING=your_new_key_here
```

Then restart the server.

### Changing Port

Edit `.env`:
```env
PORT=8080
```

---

## 🌐 Deployment

### For Production:

1. **Never expose `.env` file**
2. Use environment variables on your hosting platform:
   - Heroku: `heroku config:set GEMINI_API_KEY_CODING=...`
   - Vercel: Add in project settings
   - Netlify: Add in site settings

3. Update `BACKEND_API_URL` in `script.js` to your production URL:
```javascript
const BACKEND_API_URL = 'https://your-domain.com/api/gemini';
```

---

## 🆘 Troubleshooting

### "Cannot connect to backend server"
- Make sure the server is running (`npm start`)
- Check that port 3000 is not blocked by firewall

### "API keys not found"
- Verify `.env` file exists
- Check that API keys are properly formatted
- Restart the server after changing `.env`

### Server won't start
- Run `npm install` to install dependencies
- Check if port 3000 is already in use

---

## 📝 Development Scripts

```bash
# Start production server
npm start

# Start with auto-reload (development)
npm run dev
```

---

## ⚠️ Security Checklist

- [x] API keys in `.env` file
- [x] `.env` added to `.gitignore`
- [x] Backend proxy server implemented
- [x] Client-side code has no hardcoded keys
- [x] Environment variables used for configuration

---

## 🎨 Features

- **AI-Powered Generation**: Create stunning portfolios with AI
- **Multiple Themes**: Professional, Glassmorphism, Neon styles
- **Chat Interface**: Edit portfolios conversationally
- **Image Upload**: Add profile pictures and images
- **ZIP Download**: Export complete portfolio
- **Fully Responsive**: Works on all devices

---

## 📄 License

MIT License - Feel free to use and modify!

---

## 🙏 Credits

Built with:
- Express.js - Backend server
- Gemini AI - Content generation
- FontAwesome - Icons
- Google Fonts - Typography

---

**🔒 Your API keys are now 100% secure! 🎉**
