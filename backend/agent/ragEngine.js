class RAGEngine {
  constructor() {
    this.extractor = null;
    this.documents = []; 
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    console.log("Loading embedding model...");
    try {
        // Dynamic import to prevent load-time crashes on Vercel
        const { pipeline, env } = await import('@xenova/transformers');
        
        // Configure cache directory for Vercel (read-only file system except /tmp)
        env.cacheDir = '/tmp/.cache';
        env.allowLocalModels = false; // Force download from remote if not found
        env.useBrowserCache = false;

        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        this.isInitialized = true;
        console.log("Embedding model loaded.");
    } catch (error) {
        console.error("Failed to load embedding model:", error);
        // Fallback or rethrow? Rethrowing will cause the request to fail, which is correct.
        throw error;
    }
  }

  async embed(text) {
    if (!this.isInitialized) await this.init();
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return output.data;
  }

  chunkText(text, chunkSize = 300, overlap = 50) {
    const chunks = [];
    const words = text.split(/\s+/);
    
    if (words.length <= chunkSize) {
        return [text];
    }

    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.length > 0) chunks.push(chunk);
    }
    return chunks;
  }

  /**
   * Indexes a document.
   * @param {string} text - The full text of the document.
   * @param {string} sourceId - An identifier for the source (e.g., filename).
   */
  async addDocument(text, sourceId = 'default') {
    if (!this.isInitialized) await this.init();
    
    this.documents = this.documents.filter(d => d.sourceId !== sourceId);

    const chunks = this.chunkText(text);
    console.log(`[RAG] Chunking document '${sourceId}' into ${chunks.length} parts...`);

    for (const chunk of chunks) {
      const embedding = await this.embed(chunk);
      this.documents.push({
        sourceId,
        text: chunk,
        embedding
      });
    }
    console.log(`[RAG] Indexed ${chunks.length} chunks.`);
  }

  cosineSimilarity(a, b) {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Retrieves the most relevant chunks for a query.
   * @param {string} query - The search query (e.g., topic).
   * @param {number} k - Number of chunks to retrieve.
   * @returns {Promise<string>} - Combined text of top-k chunks.
   */
  async retrieve(query, k = 5) {
    if (!this.isInitialized) await this.init();
    if (this.documents.length === 0) return "";

    console.log(`[RAG] Retrieving context for query: "${query}"`);
    const queryEmbedding = await this.embed(query);
    
    const scored = this.documents.map(doc => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    scored.sort((a, b) => b.score - a.score);
    
    const topK = scored.slice(0, k);
    console.log(`[RAG] Found ${topK.length} relevant chunks.`);
    
    return topK.map(d => d.text).join("\n\n...[Context Break]...\n\n");
  }
  
  clear() {
      this.documents = [];
  }
}

export const ragEngine = new RAGEngine();
