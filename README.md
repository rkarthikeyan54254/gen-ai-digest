# GenAI Digest 🚀
https://gen-ai-digest.netlify.app/

GenAI Digest is a modern, generation-focused AI news aggregator that delivers personalized artificial intelligence news based on your generation's perspective and interests. Whether you're Gen Z, a Millennial, Gen X, or a Boomer, GenAI Digest curates AI news that matters to you.

![GenAI Digest Screenshot](<https://github.com/user-attachments/assets/56bab370-58ce-4bdb-a491-718ca261866c>)

## 🌟 Features

- **Generation-Specific News**: Tailored AI news for different generations:
  - 🚀 Gen Z (Ages 10-25)
  - 💫 Millennials (Ages 26-41)
  - ⚡ Gen X (Ages 42-57)
  - ✨ Boomers (Ages 58-76)

- **Smart Content Curation**: Uses AI to analyze and categorize news based on generational relevance
- **Real-time Updates**: Fresh AI news from reliable sources
- **Beautiful UI**: Clean, modern interface with smooth animations
- **Mobile Responsive**: Perfect experience across all devices

## 🛠️ Tech Stack

- **Frontend**:
  - React 18
  - TypeScript
  - Tailwind CSS
  - Vite

- **Backend**:
  - Supabase (Database & Authentication)
  - Edge Functions (Serverless)

- **AI/ML**:
  - OpenAI GPT for content analysis
  - News API for data sourcing

- **Deployment**:
  - Netlify (Frontend)
  - Supabase (Backend)

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/genai-digest.git
   ```

2. Install dependencies:
   ```bash
   cd genai-digest
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📚 Project Structure

```
genai-digest/
├── src/
│   ├── components/    # React components
│   ├── lib/          # Utilities and configurations
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Application entry point
├── supabase/
│   └── functions/    # Edge Functions
└── public/           # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) for the amazing backend infrastructure
- [OpenAI](https://openai.com/) for the powerful AI capabilities
- [News API](https://newsapi.org/) for reliable news data
- [Tailwind CSS](https://tailwindcss.com/) for the beautiful styling system

## 🔗 Links

- [Live Demo](https://idyllic-tanuki-505f38.netlify.app)
- [Documentation](https://github.com/yourusername/genai-digest/wiki)
- [Report Bug](https://github.com/yourusername/genai-digest/issues)
- [Request Feature](https://github.com/yourusername/genai-digest/issues)
