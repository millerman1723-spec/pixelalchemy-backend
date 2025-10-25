require('dotenv').config();
const express = require('express');
// Using the recommended Google Gen AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all requests
app.use(limiter);

// Allow requests from your specific GitHub Pages frontend
app.use(cors({
  origin: 'https://millerman1723-spec.github.io'
}));

// Allow for large JSON payloads, necessary for base64 image data
app.use(express.json({ limit: '20mb' })); 

// Middleware to validate required fields for /generate endpoint
const validateGenerateRequest = (req, res, next) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ 
      error: "Missing required field", 
      details: "The 'prompt' field is required"
    });
  }
  
  // If image is provided, validate it has required properties
  if (req.body.image) {
    const { data, mimeType } = req.body.image;
    if (!data || !mimeType) {
      return res.status(400).json({
        error: "Invalid image data",
        details: "When providing an image, both 'data' and 'mimeType' are required"
      });
    }
  }
  
  // If mask is provided, validate it has required properties
  if (req.body.mask) {
    const { data, mimeType } = req.body.mask;
    if (!data || !mimeType) {
      return res.status(400).json({
        error: "Invalid mask data",
        details: "When providing a mask, both 'data' and 'mimeType' are required"
      });
    }
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("❌ ERROR: GOOGLE_API_KEY is not set in environment variables!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Converts base64 image data into the structured Part object required by the Gemini API.
 * It also strips the common data URL prefix if present.
 * @param {string} base64Data The base64 string of the file.
 * @param {string} mimeType The MIME type (e.g., 'image/png').
 * @returns {object} A Part object for the API request.
 */
function base64ToGenerativePart(base64Data, mimeType) {
  // Strip common data URL prefixes (e.g., 'data:image/png;base64,')
  const data = base64Data.split(',').pop();
  return {
    inlineData: {
      data: data,
      mimeType: mimeType
    }
  };
}

app.post('/generate', validateGenerateRequest, async (req, res) => {
  try {
    const { prompt, negative, image, mask } = req.body;
    
    // NOTE: creativity and strength parameters are typically used for older Imagen models.
    // For gemini-2.5-flash-image-preview, control is primarily done via prompt and mask.

    // Construct the full prompt, including negative keywords within the prompt text
    const fullPrompt = `${prompt}. --negative ${negative || 'blurry, low quality, watermarks'}`;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image-preview" 
    });

    let request;
    
    // --- Image-to-Image (I2I) and Inpainting Flow ---
    if (image && image.data && image.mimeType) {
      console.log(`🖼️ Request received: Image-to-Image/Inpainting. Prompt: ${prompt.substring(0, 40)}...`);

      // 1. Start building the content array with the prompt and the base image
      const parts = [
        { text: fullPrompt },
        base64ToGenerativePart(image.data, image.mimeType),
      ];

      // 2. If a mask is provided, add it for inpainting
      if (mask && mask.data && mask.mimeType) {
        parts.push(base64ToGenerativePart(mask.data, mask.mimeType));
        console.log("   - Mask detected for Inpainting.");
      }
      
      // The request needs to be structured as a contents array when including image parts
      request = { contents: [{ parts: parts }] };

    } else {
      // --- Text-to-Image (T2I) Flow ---
      console.log(`✨ Request received: Text-to-Image. Prompt: ${prompt.substring(0, 40)}...`);
      // For T2I, a simple string prompt works
      request = fullPrompt;
    }
    
    // Send the request to the Gemini API
    const result = await model.generateContent(request);
    const response = await result.response;
    
    // Extract the generated image data (base64)
    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    if (!imagePart) {
      console.error("API Response structure missing image data:", response);
      // Attempt to return the error message if the API provided one
      const errorText = response.candidates?.[0]?.content?.parts?.[0]?.text || "No image data returned from API and no error message found.";
      throw new Error(errorText);
    }
    
    // Success: return the base64 image data and the finish reason
    return res.json({ 
      image: imagePart.inlineData.data,
      finishReason: response.candidates[0].finishReason
    });

  } catch (error) {
    console.error("🔥 API Error:", error.message);
    res.status(500).json({ 
      error: "Image Generation Failed.", 
      details: error.message,
      checkLogs: "Check server logs for full traceback."
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("✨ Ready to process PixelAlchemy requests");
});
