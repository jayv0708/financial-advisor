/**
 * categorizer.js — Browser Inference Engine
 * ==========================================
 * Loads the pre-trained TF-IDF + Logistic Regression model (exported from
 * the Python training pipeline as JSON) and runs inference in JavaScript.
 *
 * HOW IT WORKS:
 *   1. Fetch classifier_model_v1.json from /public/models/
 *   2. Reproduce TF-IDF vectorization in JS using stored vocabulary + IDF weights
 *   3. Compute log-softmax via matrix multiplication (dot product of feature vector
 *      with model.coef_ matrix + intercept)
 *   4. Return the class with highest probability + confidence %
 *
 * NO TF.js training in browser — pure matrix math using Float64 JS arrays.
 */

let modelCache = null;

const MODEL_URL = "/models/classifier_model_v1.json";

/**
 * Load the JSON model from /public/models/
 * Result is cached in memory for subsequent calls.
 */
export const loadClassifierModel = async () => {
  if (modelCache) return modelCache;
  try {
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`Failed to fetch model: ${response.status}`);
    const model = await response.json();
    modelCache = model;
    console.log(`[Classifier] Loaded ${model.metadata.type} (${model.metadata.version}) from Python pipeline.`);
    return model;
  } catch (err) {
    console.error("[Classifier] Could not load JSON model:", err);
    return null;
  }
};

/**
 * Initialise the model (call once on app startup).
 */
export const initModel = async () => {
  await loadClassifierModel();
};

/**
 * TF-IDF vectorization in JavaScript.
 * Reproduces the sklearn TfidfVectorizer transform step.
 *
 * Steps:
 *   1. Tokenize text (bigrams from adjacent words too)
 *   2. For each token present in vocabulary → set TF (sublinear_tf: log(1+tf))
 *   3. Multiply TF by IDF weight from model
 *   4. L2-normalize the resulting vector
 */
const vectorize = (text, model) => {
  const { vocabulary, idf } = model;
  const vocabSize = idf.length;

  // Step 1: Tokenize (unigrams + bigrams to match ngram_range=(1,2))
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const ngrams = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    ngrams.push(tokens[i] + " " + tokens[i + 1]);
  }

  // Step 2: Term Frequency (with sublinear_tf = log(1+count))
  const tf = new Array(vocabSize).fill(0);
  ngrams.forEach((ngram) => {
    const idx = vocabulary[ngram];
    if (idx !== undefined) {
      tf[idx] += 1;
    }
  });

  // Apply sublinear TF
  for (let i = 0; i < vocabSize; i++) {
    if (tf[i] > 0) tf[i] = Math.log(1 + tf[i]);
  }

  // Step 3: Multiply by IDF
  const tfidf = tf.map((v, i) => v * idf[i]);

  // Step 4: L2-normalize
  const l2norm = Math.sqrt(tfidf.reduce((sum, v) => sum + v * v, 0));
  if (l2norm === 0) return tfidf; // zero vector (unknown words)
  return tfidf.map((v) => v / l2norm);
};

/**
 * Matrix-vector dot product: coef[n_classes, n_features] · x[n_features] + intercept
 * Returns log-probabilities (scores) for each class.
 */
const computeLogits = (featureVector, model) => {
  return model.coef.map((classWeights, classIdx) => {
    let logit = model.intercept[classIdx];
    for (let i = 0; i < featureVector.length; i++) {
      logit += classWeights[i] * featureVector[i];
    }
    return logit;
  });
};

/**
 * Softmax to convert logits to probabilities.
 */
const softmax = (logits) => {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sumExps);
};

/**
 * Main inference function.
 * @param {string} text - Transaction description (e.g. "Swiggy order")
 * @returns {{ category: string, confidence: number }} - Predicted class + confidence %
 */
export const predictCategory = async (text) => {
  const model = await loadClassifierModel();
  if (!model) return { category: "Others", confidence: 0 };

  const featureVector = vectorize(text, model);
  const isZeroVector = featureVector.every((v) => v === 0);
  if (isZeroVector) return { category: "Others", confidence: 60 };

  const logits = computeLogits(featureVector, model);
  const probabilities = softmax(logits);

  // Pick argmax
  let maxIdx = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[maxIdx]) maxIdx = i;
  }

  return {
    category: model.classes[maxIdx],
    confidence: Math.round(probabilities[maxIdx] * 100),
  };
};
