import { createClient } from 'npm:@supabase/supabase-js@2.39.0'
import { Configuration, OpenAIApi } from 'npm:openai@3.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Attempt ${i + 1}: API request failed with status ${response.status}:`, errorText);
        
        if (i === retries - 1) {
          throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }
      } else {
        return response;
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i === retries - 1) {
        throw error;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
  }
  
  throw new Error('All retry attempts failed');
}

async function fetchAINews(newsApiKey: string) {
  if (!newsApiKey?.trim()) {
    throw new Error('Invalid NEWS_API_KEY');
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromDateString = fromDate.toISOString().split('T')[0];

  const params = new URLSearchParams({
    apiKey: newsApiKey,
    q: '("artificial intelligence" OR "AI" OR "machine learning" OR "ChatGPT" OR "GPT-4" OR "LLM" OR "large language model") AND (technology OR innovation OR development OR research OR application)',
    language: 'en',
    pageSize: '30',
    sortBy: 'publishedAt',
    from: fromDateString
  });

  try {
    const url = `https://newsapi.org/v2/everything?${params}`;
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'TimelineAI/1.0',
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from News API');
    }
    
    if (!Array.isArray(data.articles)) {
      throw new Error('No articles array in response');
    }
    
    if (data.articles.length === 0) {
      throw new Error('No articles found');
    }

    // Stricter filtering for AI-related content
    return data.articles
      .filter(article => {
        if (!article?.title || !article?.description) return false;
        
        const content = (article.title + ' ' + article.description).toLowerCase();
        
        // Must contain at least one primary AI term
        const primaryAITerms = [
          'artificial intelligence',
          'machine learning',
          'chatgpt',
          'gpt-4',
          'large language model',
          'llm',
          'deep learning'
        ];
        
        // And at least one tech/application term
        const techTerms = [
          'technology',
          'software',
          'application',
          'development',
          'research',
          'innovation',
          'startup',
          'company',
          'product',
          'service',
          'platform'
        ];
        
        const hasAITerm = primaryAITerms.some(term => content.includes(term));
        const hasTechTerm = techTerms.some(term => content.includes(term));
        
        // Filter out articles that just mention "AI" without context
        if (content.includes(' ai ') && !hasAITerm) {
          return false;
        }
        
        return hasAITerm && hasTechTerm;
      })
      .slice(0, 15);
  } catch (error) {
    console.error('News API error:', error);
    throw new Error(`Failed to fetch news: ${error.message}`);
  }
}

async function classifyByGeneration(article: any, openai: OpenAIApi) {
  if (!article?.title || !article?.description) {
    throw new Error('Invalid article data for classification');
  }

  const prompt = `
You are an AI news classification expert.

Your task is to determine whether the following article is:
1. **Primarily about AI or core AI technologies** (like machine learning, LLMs, AI applications, AI ethics, innovations, breakthroughs, etc.)
2. **NOT about finance, stock markets, earnings, business deals, or vague mentions of AI**
3. **Relevant to each generation** based on their tech habits, lifestyle, and how the AI development might impact them.

For each generation, respond ONLY with "Yes" or "No" based on these rules.

Article Title: ${article.title}
Article Description: ${article.description}

For each generation, respond ONLY with "Yes" or "No" based on these rules.

- The article must be specifically about AI/technology
- The content should be relevant to that generation's typical interaction with or interest in AI
- Consider each generation's technical literacy and use of technology
- Consider how the AI development might impact their daily lives or work

Respond in this exact format:
1. Gen Z (10-25): Yes/No
2. Millennials (26-41): Yes/No
3. Gen X (42-57): Yes/No
4. Boomers (58-76): Yes/No
If the article is not clearly and primarily about AI or AI technology, respond with "No" for all generations.`


  try {
    const completion = await fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 100
        })
      }
    );

    const data = await completion.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

async function processArticlesBatch(articles: any[], openai: OpenAIApi) {
  if (!Array.isArray(articles)) {
    throw new Error('Invalid articles data for processing');
  }

  const batchPromises = articles.map(article => 
    classifyByGeneration(article, openai)
      .then(classification => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name,
        generation_relevance: classification
      }))
      .catch(error => {
        console.error(`Failed to process article: ${article.title}`, error);
        return null;
      })
  );

  const results = await Promise.all(batchPromises);
  const validResults = results.filter(result => result !== null);
  
  if (validResults.length === 0) {
    throw new Error('No articles could be processed successfully');
  }
  
  return validResults;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const newsApiKey = Deno.env.get('NEWS_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!newsApiKey?.trim()) {
      throw new Error('NEWS_API_KEY not configured');
    }

    if (!openaiApiKey?.trim()) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const openai = new OpenAIApi(new Configuration({ apiKey: openaiApiKey }));
    
    const articles = await fetchAINews(newsApiKey);
    const processedArticles = await processArticlesBatch(articles, openai);

    return new Response(
      JSON.stringify(processedArticles),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});