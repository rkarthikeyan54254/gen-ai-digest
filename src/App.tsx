import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

interface Article {
  title: string;
  description: string;
  url: string;
  source: string;
  generation_relevance: string;
}

const generations = [
  { id: 'gen z', name: 'Gen Z', emoji: '🚀', years: '10-25', color: 'bg-purple-100 hover:bg-purple-200', gradient: 'from-purple-500 to-pink-500' },
  { id: 'millennials', name: 'Millennials', emoji: '💫', years: '26-41', color: 'bg-blue-100 hover:bg-blue-200', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'gen x', name: 'Gen X', emoji: '⚡', years: '42-57', color: 'bg-green-100 hover:bg-green-200', gradient: 'from-green-500 to-emerald-500' },
  { id: 'boomers', name: 'Boomers', emoji: '✨', years: '58-76', color: 'bg-orange-100 hover:bg-orange-200', gradient: 'from-orange-500 to-amber-500' },
];

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null);
  const [visibleArticles, setVisibleArticles] = useState(5);

  useEffect(() => {
    async function fetchNews() {
      if (!selectedGeneration) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching news for generation:', selectedGeneration);

        const { data, error: fetchError } = await supabase.functions.invoke('fetch-news', {
          body: JSON.stringify({ generation: selectedGeneration })
        });
        
        if (fetchError) {
          console.error('Edge Function error details:', fetchError);
          throw new Error(`Edge Function error: ${fetchError.message}`);
        }
        
        if (!data) {
          throw new Error('No data received from Edge Function');
        }
        
        if (data.error) {
          console.error('Edge Function returned error:', data.error);
          throw new Error(`Edge Function error: ${data.error}`);
        }
        
        setArticles(data);
      } catch (err) {
        console.error('Error fetching news:', err);
        const errorMessage = err instanceof Error 
          ? err.message
          : 'An unexpected error occurred while fetching news';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, [selectedGeneration]);

  const filterArticlesByGeneration = (articles: Article[], generation: string) => {
    return articles.filter(article => {
      if (!article.generation_relevance) return false;
      
      const relevanceText = article.generation_relevance.toLowerCase();
      let generationIdentifier = '';
      
      switch (generation) {
        case 'gen z':
          generationIdentifier = '1.';
          break;
        case 'millennials':
          generationIdentifier = '2.';
          break;
        case 'gen x':
          generationIdentifier = '3.';
          break;
        case 'boomers':
          generationIdentifier = '4.';
          break;
      }
      
      const lines = relevanceText.split('\n');
      const relevantLine = lines.find(line => 
        line.trim().startsWith(generationIdentifier)
      );
      
      return relevantLine?.toLowerCase().includes('yes') ?? false;
    });
  };

  const handleShowMore = () => {
    setVisibleArticles(prev => prev + 5);
  };

  const handleGenerationSelect = (genId: string) => {
    setSelectedGeneration(genId);
    setVisibleArticles(5);
    setArticles([]);
  };

  if (!selectedGeneration) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-4">
              Gen<span className="gradient-text">AI</span> Digest
            </h1>
            <p className="text-xl text-gray-600">
              AI News That Speaks Your Generation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {generations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => handleGenerationSelect(gen.id)}
                className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl ${gen.color}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gen.gradient} opacity-0 transition-opacity group-hover:opacity-10`} />
                <div className="relative z-10">
                  <div className="text-6xl mb-6 transform transition-transform group-hover:scale-110">
                    {gen.emoji}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {gen.name}
                  </h2>
                  <p className="text-gray-600">Age {gen.years}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setSelectedGeneration(null);
              setVisibleArticles(5);
            }}
            className="mb-8 text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors"
          >
            ← Back to Generations
          </button>
          <div className="text-center">
            <div className="animate-pulse text-2xl font-bold text-gray-400">
              Curating AI News...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setSelectedGeneration(null);
              setVisibleArticles(5);
            }}
            className="mb-8 text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors"
          >
            ← Back to Generations
          </button>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-4">
              Oops! Something went wrong
            </div>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => handleGenerationSelect(selectedGeneration)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredArticles = filterArticlesByGeneration(articles, selectedGeneration);
  const currentGeneration = generations.find(g => g.id === selectedGeneration);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => {
            setSelectedGeneration(null);
            setVisibleArticles(5);
          }}
          className="mb-8 text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors"
        >
          ← Back to Generations
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <span className="text-4xl">{currentGeneration?.emoji}</span>
          <h2 className="text-3xl font-bold text-gray-900">
            {currentGeneration?.name} AI News
          </h2>
        </div>
        
        <div className="space-y-6">
          {filteredArticles.slice(0, visibleArticles).map((article, index) => (
            <article 
              key={index} 
              className="bg-white rounded-xl shadow-md p-6 transition-transform hover:scale-[1.02]"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-blue-600 transition-colors"
                >
                  {article.title}
                </a>
              </h2>
              
              <p className="text-sm text-gray-500 mb-3">
                Source: {article.source}
              </p>
              
              <p className="text-gray-700">
                {article.description}
              </p>
            </article>
          ))}

          {filteredArticles.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              No AI news articles found for this generation yet.
            </div>
          )}
        </div>
        
        {filteredArticles.length > visibleArticles && (
          <div className="text-center mt-8">
            <button
              onClick={handleShowMore}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show More Articles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;