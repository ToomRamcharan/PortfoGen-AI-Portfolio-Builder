// ✅ SECURE CONFIGURATION - API Keys are now stored safely on the backend server
// No more exposed keys in client-side code!

// Backend API endpoint (your secure server)
const BACKEND_API_URL = 'http://localhost:3000/api/gemini';

// Key types for different operations
const KEY_TYPES = {
    CODING: 'CODING',
    DESIGN: 'DESIGN',
    PLANNING: 'PLANNING',
    THEME: 'THEME'
};

// DOM Elements
const elements = {
    name: document.getElementById('name'),
    role: document.getElementById('role'),
    skills: document.getElementById('skills'),
    experience: document.getElementById('experience'),
    projects: document.getElementById('projects'),
    templateStyle: document.getElementById('templateStyle'),
    profilePic: document.getElementById('profile-pic'),

    btnGenerate: document.getElementById('btn-generate'),

    // Chat Elements
    chatInput: document.getElementById('chat-input'),
    btnSendChat: document.getElementById('btn-send-chat'),
    btnUploadChat: document.getElementById('btn-upload-chat'),
    chatFile: document.getElementById('chat-file'),
    chatHistory: document.getElementById('chat-history'),

    // Output Elements
    jsonOutput: document.getElementById('json-output'),
    previewFrame: document.getElementById('portfolio-preview'),
    status: document.getElementById('api-status'),

    // Tabs
    outputTabs: document.querySelectorAll('.tab-btn'),
    outputContents: document.querySelectorAll('.tab-content'),
    panelTabs: document.querySelectorAll('.panel-tab'),
    panelContents: document.querySelectorAll('.panel-content')
};

// State
let currentGeneratedCode = '';
let currentChatImage = null; // Stores Base64 of selected chat image
let currentProfilePicBase64 = null; // Stores Base64 of main profile pic

// --- Event Listeners ---

// 1. Panel Tab Switching
elements.panelTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        switchPanel(tab.dataset.panel);
    });
});

// 2. Output Tab Switching
elements.outputTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.outputTabs.forEach(t => t.classList.remove('active'));
        elements.outputContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
});

// 3. Actions
elements.btnGenerate.addEventListener('click', () => handleAction('generate_portfolio'));
elements.btnSendChat.addEventListener('click', () => handleChat());
elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChat();
    }
});

// 4. Chat Upload
elements.btnUploadChat.addEventListener('click', () => elements.chatFile.click());
elements.chatFile.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        try {
            const base64 = await fileToBase64(file);
            currentChatImage = base64;
            elements.btnUploadChat.style.color = '#56d364'; // Green to indicate selection
            elements.btnUploadChat.title = `Selected: ${file.name}`;
            updateChatPreview(base64); // Show preview
        } catch (err) {
            console.error(err);
            alert("Error reading file");
        }
    }
});

document.getElementById('btn-copy-json').addEventListener('click', () => {
    navigator.clipboard.writeText(elements.jsonOutput.textContent);
    alert('Code copied to clipboard!');
});


// --- Logic ---

function switchPanel(panelName) {
    elements.panelTabs.forEach(t => t.classList.remove('active'));
    elements.panelContents.forEach(c => c.classList.remove('active'));

    document.querySelector(`.panel-tab[data-panel="${panelName}"]`).classList.add('active');
    document.getElementById(`panel-${panelName}`).classList.add('active');
}

async function handleAction(actionType) {
    setLoading(true);

    try {
        let profilePicBase64 = null;
        if (elements.profilePic.files.length > 0) {
            profilePicBase64 = await fileToBase64(elements.profilePic.files[0]);
            currentProfilePicBase64 = profilePicBase64; // Store globally
        }

        const inputs = {
            name: elements.name.value,
            role: elements.role.value,
            skills: elements.skills.value,
            experience: elements.experience.value,
            projects: elements.projects.value,
            templateStyle: elements.templateStyle.value,
            actionType: actionType,
            profilePic: profilePicBase64
        };

        console.log("Sending Inputs to Gemini:", inputs);

        // Select key type based on action
        let keyType = KEY_TYPES.CODING;
        if (actionType === 'generate_portfolio' && inputs.templateStyle === '3') keyType = KEY_TYPES.THEME;

        const prompt = constructPrompt(inputs);
        const response = await callGemini(keyType, prompt);

        if (response) {
            processResponse(response);
            // Auto-switch to chat after generation
            if (actionType === 'generate_portfolio') {
                addChatMessage('ai', 'Portfolio generated! You can now ask me to make changes here.');
                switchPanel('edit');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        elements.status.textContent = 'Error: ' + error.message;
        elements.status.className = 'status-error';
    } finally {
        setLoading(false);
    }
}

async function handleChat() {
    const userMessage = elements.chatInput.value.trim();
    if (!userMessage && !currentChatImage) return;

    // Add User Message
    const displayMsg = userMessage + (currentChatImage ? ' [Image Attached]' : '');
    addChatMessage('user', displayMsg);

    elements.chatInput.value = '';

    // Add temporary loading message
    const loadingMsg = addChatMessage('ai', 'Working on it...');
    setLoading(true);

    try {
        let prompt;
        let keyType = KEY_TYPES.CODING; // Default for creation

        // Capture current chat image before clearing
        const pendingChatImage = currentChatImage;

        if (!currentGeneratedCode) {
            // CREATION MODE via Chat
            const inputs = {
                name: elements.name.value || "User",
                role: elements.role.value || "Developer",
                skills: elements.skills.value || "Web Development",
                experience: elements.experience.value || "Building cool things.",
                projects: elements.projects.value || "Portfolio Project",
                templateStyle: elements.templateStyle.value,
                profilePic: null // Chat creation doesn't pull form profile pic automatically unless specified, keeping simple
            };

            prompt = constructPrompt(inputs, userMessage); // Pass userMessage as extra context
            keyType = KEY_TYPES.CODING;
            if (inputs.templateStyle === '3') keyType = KEY_TYPES.THEME;

        } else {
            // EDIT MODE
            let imageInstruction = "";
            if (pendingChatImage) {
                imageInstruction = `
                ### IMAGE ATTACHED
                The user has attached an image to this request.
                If the user asks to use this image (e.g., "add this image", "make this my profile pic"), 
                use the placeholder "__CHAT_IMAGE__" as the src attribute value.
                Example: <img src="__CHAT_IMAGE__" alt="User Image">
                DO NOT put the base64 string directly in the code.
                `;
            }

            prompt = `
            You are an expert web developer assistant.
            
            ### CURRENT CODE
            ${currentGeneratedCode}
            
            ### USER REQUEST
            ${userMessage}
            
            ${imageInstruction}
            
            ### INSTRUCTIONS
            1. Modify the CURRENT CODE to satisfy the USER REQUEST.
            2. Return the COMPLETE, updated single-file HTML code.
            3. Do not output markdown. Just the code.
            4. **Preserve Integrity**: Ensure all scripts, styles, and CDNs remain intact unless explicitly changed.
            `;

            // Dynamic Key Selection based on intent
            keyType = KEY_TYPES.DESIGN;
            const lowerMsg = userMessage.toLowerCase();

            if (lowerMsg.includes('theme') || lowerMsg.includes('color') || lowerMsg.includes('background') || lowerMsg.includes('font')) {
                keyType = KEY_TYPES.THEME;
            } else if (lowerMsg.includes('add') || lowerMsg.includes('create') || lowerMsg.includes('script') || lowerMsg.includes('function')) {
                keyType = KEY_TYPES.CODING;
            }
        }

        // Call API with optional image
        const response = await callGemini(keyType, prompt, pendingChatImage);

        // Clear image after use
        clearChatImage();

        // Remove loading message
        if (loadingMsg) loadingMsg.remove();

        if (response) {
            // Process response and inject chat image if placeholder exists
            processResponse(response, pendingChatImage);
            addChatMessage('ai', 'I updated the portfolio based on your request.');
        }

    } catch (error) {
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('ai', 'Sorry, I encountered an error: ' + error.message);
    } finally {
        setLoading(false);
    }
}

// 🔒 SECURE Gemini API Call via Backend Proxy
// API keys are never exposed to the client!
async function callGemini(keyType, promptText, imageBase64 = null) {
    try {
        const payload = {
            keyType: keyType,
            prompt: promptText,
            imageBase64: imageBase64
        };

        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Could not parse error JSON
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Extract text from Gemini response format
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        }

        throw new Error('Invalid response format from server');

    } catch (error) {
        // Check if backend server is running
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Cannot connect to backend server. Please make sure the server is running (npm start)');
        }
        throw error;
    }
}

// Prompt Construction
function constructPrompt(inputs, chatContext = "") {
    let imageInstruction = "";
    if (inputs.profilePic) {
        imageInstruction = `
        ### ASSETS
        The user has uploaded a profile picture. 
        Use this PLACEHOLDER as the src for the main profile image: "__PROFILE_PIC_BASE64__"
        DO NOT put the actual base64 string here. Just use the placeholder.
        Ensure the image is styled as a circle or appropriate shape.
        `;
    }

    let extraContext = "";
    if (chatContext) {
        extraContext = `
        ### USER CUSTOM REQUEST
        The user has provided this specific description/request: "${chatContext}"
        **PRIORITIZE this request over the standard form inputs.**
        `;
    }

    return `
You are NLRC Portfolio Builder — an elite AI web developer.
Your job is to generate a **PREMIUM, PRODUCTION-READY** single-file HTML portfolio.

### USER INPUTS
Name: ${inputs.name}
Role/Title: ${inputs.role}
Skills: ${inputs.skills}
Experience: ${inputs.experience}
Projects: ${inputs.projects}
Template Style: ${inputs.templateStyle}
  (1 = Minimal Professional Dark Developer Theme
   2 = Glassmorphism Modern Gradient UI
   3 = Neon Futuristic Terminal UI)

${imageInstruction}
${extraContext}

### TECHNICAL REQUIREMENTS (CRITICAL)
1. **Single File**: Return ONLY raw HTML with embedded <style> and <script>. NO markdown blocks.
2. **Icons**: Use **FontAwesome 6** via CDN: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">. Use icons for skills, contact links, and project cards.
3. **Fonts**: Use Google Fonts (Inter, Poppins, Fira Code).
4. **Responsiveness**: Must be fully mobile-responsive (hamburger menu for mobile).
5. **Animations**: Add subtle CSS animations (fade-in, slide-up) on load and hover.

### DESIGN GUIDELINES
- **Modern Layout**: Use CSS Grid/Flexbox. No old-school floats.
- **Visuals**: Use gradients, shadows, and rounded corners appropriate for the style.
- **Interactivity**: 
  - Smooth scrolling for nav links.
  - Hover effects on buttons and cards.
  - Mobile menu toggle functionality in JS.

### OUTPUT
Return the complete HTML string.
`;
}

// Response Processing
function processResponse(responseText, chatImageBase64 = null) {
    // Clean up markdown code blocks
    let cleanCode = responseText.replace(/```html/g, '').replace(/```/g, '').trim();

    // Inject Profile Picture if available
    if (currentProfilePicBase64) {
        cleanCode = cleanCode.replace(/__PROFILE_PIC_BASE64__/g, currentProfilePicBase64);
    }

    // Inject Chat Image if available and placeholder exists
    if (chatImageBase64) {
        cleanCode = cleanCode.replace(/__CHAT_IMAGE__/g, chatImageBase64);
    }

    currentGeneratedCode = cleanCode;

    // Update Code View
    elements.jsonOutput.textContent = cleanCode;

    // Update Visual Preview
    renderPreview(cleanCode);

    elements.status.textContent = 'Success';
    elements.status.className = 'status-ready';

    // Show Download ZIP button
    const btnDownloadZip = document.getElementById('btn-download-zip');
    if (btnDownloadZip) {
        btnDownloadZip.style.display = 'block';
    }
}

// Render Preview
function renderPreview(code) {
    const p = elements.previewFrame;
    p.innerHTML = '';
    p.style.padding = '0';
    p.style.overflow = 'hidden';

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.backgroundColor = '#ffffff';

    p.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(code);
    doc.close();
}

function setLoading(isLoading) {
    if (isLoading) {
        elements.status.textContent = 'Thinking...';
        elements.status.className = 'status-loading';
        elements.btnGenerate.disabled = true;
        elements.btnSendChat.disabled = true;
    } else {
        elements.status.textContent = 'Ready';
        elements.status.className = 'status-ready';
        elements.btnGenerate.disabled = false;
        elements.btnSendChat.disabled = false;
    }
}

function addChatMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    div.innerHTML = `<div class="message-content">${text}</div>`;
    elements.chatHistory.appendChild(div);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
    return div; // Return the element so we can remove it if needed
}

// Helper: Convert File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            reject(new Error("File is too large. Max 2MB."));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- Animations ---

// 1. Loader
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 1500); // Show for 1.5 seconds
    }
});

// --- Chat Preview Logic ---
function updateChatPreview(base64) {
    let preview = document.getElementById('chat-preview');
    if (!base64) {
        if (preview) preview.remove();
        return;
    }

    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'chat-preview';
        preview.className = 'chat-preview';
        elements.chatInput.parentElement.appendChild(preview); // Append to chat-input-area
    }

    preview.innerHTML = `
        <img src="${base64}" alt="Upload Preview">
        <button onclick="clearChatImage()">×</button>
    `;
}

function clearChatImage() {
    currentChatImage = null;
    elements.chatFile.value = '';
    elements.btnUploadChat.style.color = '';
    elements.btnUploadChat.title = 'Upload Image';
    updateChatPreview(null);
}

// Make clearChatImage global so onclick works
window.clearChatImage = clearChatImage;
window.updateChatPreview = updateChatPreview;

// Download ZIP functionality
const btnDownloadZip = document.getElementById('btn-download-zip');

if (btnDownloadZip) {
    btnDownloadZip.addEventListener('click', async () => {
        console.log("Download ZIP clicked");

        if (!currentGeneratedCode) {
            console.log("No generated code found");
            alert('Please generate a portfolio first!');
            return;
        }

        console.log("Generating ZIP...");
        try {
            if (typeof JSZip === 'undefined') {
                throw new Error("JSZip library not loaded");
            }
            if (typeof saveAs === 'undefined') {
                throw new Error("FileSaver library not loaded");
            }

            const zip = new JSZip();

            // Add the HTML file
            zip.file('index.html', currentGeneratedCode);

            // Add README with Unblock Instructions
            const readme = `# Portfolio Website

This portfolio was generated using NLRC Portfolio Builder AI.

## ⚠️ Windows Security Warning?
If Windows blocks the index.html file:
1. Right-click **index.html**
2. Select **Properties**
3. Check **"Unblock"** at the bottom
4. Click **Apply** and **OK**

## How to Use
1. Open index.html in any modern web browser
2. The portfolio is a single-file HTML with embedded CSS
3. You can host this on GitHub Pages, Netlify, or any static hosting service

## Customization
The HTML file contains all styles inline. You can:
- Edit the HTML directly to change content
- Modify the <style> section to adjust colors and layout
- Add your own images by replacing the base64 encoded ones

Generated with ❤️ by NLRC Portfolio Builder AI
`;
            zip.file('README.md', readme);

            // Generate the ZIP file
            console.log("Creating ZIP blob...");
            const blob = await zip.generateAsync({
                type: 'blob',
                compression: "DEFLATE",
                mimeType: "application/zip"
            });
            console.log("ZIP blob created, size:", blob.size);

            // Inform user about potential browser warnings
            alert("Downloading Portfolio...\n\nIMPORTANT: Windows may block the file for security.\n\nIf you see a 'Harmful file' warning:\n1. Right-click the file -> Properties\n2. Check 'Unblock' -> OK\n\nThis is normal for downloaded HTML files.");

            // Download using FileSaver.js or fallback
            console.log("Saving file...");
            downloadBlob(blob, 'nlrc-portfolio.zip');
            console.log("Save initiated");

        } catch (error) {
            console.error('Error creating ZIP:', error);
            alert('Failed to create ZIP file: ' + error.message);
        }
    });
} else {
    console.error("Download ZIP button not found in DOM");
}

// Helper: Robust Download Function
function downloadBlob(blob, filename) {
    // Method 1: FileSaver.js (Preferred)
    if (typeof saveAs !== 'undefined') {
        try {
            saveAs(blob, filename);
            return;
        } catch (e) {
            console.warn("FileSaver.js failed, trying fallback...", e);
        }
    }

    // Method 2: Anchor Tag Fallback
    try {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        console.error("Download fallback failed:", e);
        alert("Could not download file. Please check browser permissions.");
    }
}
