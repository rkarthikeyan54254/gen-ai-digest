import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

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
  console.log('Starting fetchAINews...');
  
  if (!newsApiKey?.trim()) {
    throw new Error('Invalid NEWS_API_KEY');
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const fromDateString = fromDate.toISOString().split('T')[0];

  const params = new URLSearchParams({
    apiKey: newsApiKey,
    q: 'artificial intelligence OR AI OR ChatGPT OR GPT-4',
    language: 'en',
    pageSize: '10',
    sortBy: 'publishedAt',
    from: fromDateString
  });

  try {
    console.log('Fetching from News API...');
    const url = `https://newsapi.org/v2/everything?${params}`;
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'TimelineAI/1.0',
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'error') {
      console.error('News API error:', data.message);
      throw new Error(data.message);
    }
    
    console.log('News API response:', {
      status: data.status,
      totalResults: data.totalResults,
      articlesCount: data.articles?.length
    });
    
    if (!Array.isArray(data.articles) || data.articles.length === 0) {
      throw new Error('No articles found in News API response');
    }

    return data.articles
      .filter(article => article?.title && article?.description)
      .map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name || 'Unknown'
      }));
  } catch (error) {
    console.error('Error in fetchAINews:', error);
    throw error;
  }
}

async function classifyByGeneration(article: any, apiKey: string) {
  try {
    console.log('Classifying article:', article.title);
    
    const prompt = `
Article Title: ${article.title}
Article Description: ${article.description}

Is this AI-related article relevant for each generation? Answer ONLY with "Yes" or "No" for each:

Gen Z (10-25):
Millennials (26-41):
Gen X (42-57):
Boomers (58-76):`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ 
          role: 'system',
          content: 'You are an expert at analyzing AI news articles and determining their relevance to different generations. Respond only with Yes or No for each generation.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 60
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response:', data);
      throw new Error('Invalid response from OpenAI');
    }

    console.log('Classification result:', data.choices[0].message.content);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in classifyByGeneration:', error);
    throw error;
  }
}

async function processArticles(articles: any[], openaiApiKey: string) {
  console.log(`Processing ${articles.length} articles...`);
  const processedArticles = [];

  for (const article of articles) {
    try {
      const classification = await classifyByGeneration(article, openaiApiKey);
      processedArticles.push({
        ...article,
        generation_relevance: classification
      });
    } catch (error) {
      console.error('Error processing article:', error);
    }
  }

  console.log(`Successfully processed ${processedArticles.length} articles`);
  return processedArticles;
}

async function getCachedNews(supabase: any, generation: string) {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const { data, error } = await supabase
    .from('news_cache')
    .select('articles, cached_at')
    .eq('generation', generation)
    .gte('cached_at', oneHourAgo.toISOString())
    .order('cached_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching cached news:', error);
    throw error;
  }

  return data?.articles || null;
}

async function cacheNews(supabase: any, generation: string, articles: any[]) {
  const { error } = await supabase
    .from('news_cache')
    .insert({
      generation,
      articles,
      cached_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error caching news:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const { generation } = await req.json();
    console.log('Processing request for generation:', generation);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const newsApiKey = Deno.env.get('NEWS_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!newsApiKey?.trim() || !openaiApiKey?.trim()) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get cached news first
    const cachedArticles = await getCachedNews(supabase, generation);
    if (cachedArticles) {
      console.log('Returning cached articles');
      return new Response(
        JSON.stringify(cachedArticles),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // If no cache, fetch and process new articles
    console.log('No cache found, fetching fresh articles...');
    const articles = await fetchAINews(newsApiKey);
    const processedArticles = await processArticles(articles, openaiApiKey);

    if (processedArticles.length > 0) {
      // Cache the results
      await cacheNews(supabase, generation, processedArticles);
    }

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