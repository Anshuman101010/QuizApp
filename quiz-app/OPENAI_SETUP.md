# Free AI Question Generation Setup

This document explains the AI question generation feature using free, open-source AI services.

## Current Implementation

The quiz app now uses **free AI services** for question generation:
- **Primary**: Hugging Face Inference API (free tier)
- **Fallback**: Mock AI generation
- **No API keys required** for basic functionality

## Features

- **Free AI Generation**: Uses Hugging Face's free inference API
- **Multiple Question Types**: Supports all question types
- **Difficulty Levels**: Easy, Medium, Hard options
- **Smart Fallback**: Automatically falls back to mock AI if free service fails
- **No Cost**: Completely free to use
- **Real-time Feedback**: Toast notifications for success/error states

## How It Works

1. **Free AI Service**: Uses Hugging Face's DialoGPT model for text generation
2. **Structured Output**: Converts AI-generated text into proper quiz questions
3. **Fallback System**: If free service fails, uses mock AI generation
4. **No Setup Required**: Works out of the box

## Usage

1. **Navigate to Quiz Creation**: Go to `/host/create-quiz`
2. **For Each Question**: You'll see an "AI Question Generator" section
3. **Enter a Prompt**: Type topics like "JavaScript functions", "World War II", "Photosynthesis"
4. **Select Difficulty**: Choose Easy, Medium, or Hard
5. **Generate**: Click the "Generate" button
6. **Review**: The AI-generated question will populate the form automatically

## Example Prompts to Try

- "JavaScript functions"
- "World War II"
- "Photosynthesis"
- "Python programming"
- "Ancient Egypt"
- "Chemical reactions"

## Error Handling

The implementation includes robust error handling:
- **Free Service Failure**: Automatically falls back to mock AI
- **Network Issues**: Graceful handling of API timeouts
- **Invalid Prompts**: Validates input before processing
- **User Feedback**: Clear success/error notifications

## Technical Details

### Free AI Service (Hugging Face)
- **Model**: microsoft/DialoGPT-medium
- **API**: https://api-inference.huggingface.co/
- **Cost**: Free (no API key required for basic usage)
- **Rate Limits**: Generous free tier limits

### Fallback System
- **Mock AI**: Generates structured questions when free service is unavailable
- **Smart Prompts**: Creates contextually relevant questions
- **Multiple Formats**: Supports all question types

## Advantages of Free AI

✅ **No Cost**: Completely free to use  
✅ **No API Keys**: No setup required  
✅ **Reliable**: Smart fallback system  
✅ **Fast**: Quick response times  
✅ **Educational**: Generates relevant questions  
✅ **Scalable**: Can handle multiple requests  

## Future Enhancements

- **Multiple Free Models**: Support for different free AI models
- **Local AI**: Option to run AI locally using Ollama
- **Question Templates**: Pre-defined templates for common topics
- **Bulk Generation**: Generate multiple questions at once
- **Custom Prompts**: Save and reuse custom prompts

## Troubleshooting

### "Generation Failed" Error
- The system will automatically retry with mock AI
- Check your internet connection
- Try a different prompt

### Slow Response
- Free services may have occasional delays
- The system will show loading states
- Fallback ensures you always get a response

### No Questions Generated
- Try simpler prompts
- Check the browser console for detailed errors
- The fallback system should always provide a question 