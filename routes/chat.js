const express = require('express');
const router = express.Router();
const axios = require('axios');
const Book = require('../models/Book');
const ChatMessage = require('../models/ChatMessage');

// Chatbot endpoint
router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const session = sessionId || Date.now().toString();

    // Obtener libros para contexto
    const books = await Book.find().select('title author categories').limit(30);
    const booksContext = books.map(b => `- ${b.title} de ${b.author}`).join('\n');

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Si no hay API key, usar respuestas predefinidas
    if (!apiKey) {
      const responses = [
        `¡Hola! Te recomiendo explorar nuestro catálogo. Tenemos libros como:\n${booksContext.slice(0, 500)}`,
        'Para encontrar libros, usa la barra de búsqueda o explora las categorías.',
        'Puedes filtrar libros por categoría como Ficción, Romance, Misterio, etc.',
        '¿Buscas algo específico? Prueba buscar por título o autor en el catálogo.'
      ];
      const botResponse = responses[Math.floor(Math.random() * responses.length)];
      
      await ChatMessage.create({ sessionId: session, userMessage: message, botResponse });
      return res.json({ response: botResponse, sessionId: session });
    }

    // Usar Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: `Eres un asistente de biblioteca virtual. Ayuda a encontrar libros.
            
Libros disponibles:
${booksContext}

Usuario pregunta: ${message}

Responde en español de forma útil y breve.`
          }]
        }]
      }
    );

    const botResponse = response.data.candidates[0].content.parts[0].text;
    await ChatMessage.create({ sessionId: session, userMessage: message, botResponse });
    
    res.json({ response: botResponse, sessionId: session });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.json({ response: 'Lo siento, hubo un error. Intenta de nuevo.', sessionId: req.body.sessionId });
  }
});

module.exports = router;
