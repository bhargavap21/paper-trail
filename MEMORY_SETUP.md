# 🧠 Semantic Memory System Quick Setup

## 1. Set up OpenAI API Key

Create a `.env.local` file in your project root:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Get your API key from:** https://platform.openai.com/api-keys

## 2. Test the System

1. **Upload a paper** at http://localhost:8080/upload
2. **Open the paper** in the reader
3. **Highlight some text** by selecting it with your mouse
4. **Check the memory graph** at http://localhost:8080/memory

## 3. What You Should See

- Nodes (circles) representing your clipped sentences
- Lines connecting similar sentences (similarity > 75%)
- Interactive controls: zoom, search, click nodes
- Real-time updates as you add more clips

## 4. Troubleshooting

If you see "3 nodes • 1 connections" but no visual graph:
- The data is working correctly
- The visualization will fall back to simpler layouts automatically
- Check browser console for any remaining errors

Your semantic memory system is working! 🎉 