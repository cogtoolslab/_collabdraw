/**
 * Core implementation for RNN-based Magenta sketch models such as SketchRNN.
 *
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Imports
 */
import * as tf from '@tensorflow/tfjs-core';

import * as support from '../core/sketch_support';

export interface MetaInfo {
  maxSeqLen: number;
  rnnSize: number;
  numMixture: number;
}

export interface SketchModel {
  metaInfo: MetaInfo;
  words: string[];
  shapes: number[][];
  params: string[];
}

/**
 * Main SketchRNN model class.
 *
 * Implementation of decoder model in https://arxiv.org/abs/1704.03477
 * 
 * TODO(hardmaru): make a "batch" continueSequence-like method
 * that runs fully on GPU.
 */
export class SketchRNNPlus {
  private sketchModel: SketchModel;

  // interface settings
  private scaleFactor = 40;

  // raw weights and dimensions directly from JSON
  private weights: Float32Array[];

  // TensorFlow.js weight matrices
  private forgetBias: tf.Scalar;
  private inputKernel: tf.Tensor2D;
  private inputBias: tf.Tensor1D;
  private outputKernel: tf.Tensor2D;
  private outputBias: tf.Tensor1D;
  private lstmKernel: tf.Tensor2D;
  private lstmBias: tf.Tensor1D;

  private rawVars: tf.Tensor[];

  // inferred model settings
  private numMixture: number;
  private rnnSize: number;
  private numWords: number;
  private words: string[];
  private numOut: number;

  /**
   * `SketchRNN` constructor.
   *
   * @param checkpointURL Path to the checkpoint directory.
   */
  constructor(sketchModel: SketchModel, maxWeight=40.0) {
    this.sketchModel = sketchModel;
    this.numMixture = this.sketchModel.metaInfo.numMixture;
    this.rnnSize = this.sketchModel.metaInfo.rnnSize;
    this.words = this.sketchModel.words;
    this.numWords = this.words.length;
    // output size = mixture of Gaussians plus 3 extra states
    this.numOut = 2 * this.numMixture * 3 + 3;

    // initialize tf tensors
    this.forgetBias = tf.scalar(1.0);
    const weightStrings = this.sketchModel.params;
    let rawWeights: Float32Array;

    this.weights = [];
    for (let i = 0; i < weightStrings.length; i++) {
      rawWeights = new Float32Array(support.stringToArray(weightStrings[i]));
      const N: number = rawWeights.length;
      for (let j = 0; j < N; j++) {
        rawWeights[j] = maxWeight * rawWeights[j] / 32767;
      }
      this.weights.push(rawWeights);
    }
    // C and H, so rnnSize * 2.
    this.inputKernel = tf.tensor2d(this.weights[0],
      [this.numWords, this.rnnSize * 2]);
    this.inputBias = tf.tensor1d(this.weights[1]);
    this.outputKernel = tf.tensor2d(this.weights[2],
      [this.rnnSize, this.numOut]);
    this.outputBias = tf.tensor1d(this.weights[3]);
    // input size is rnnSize + 5 pen states + number of categories (numWords)
    // LSTM has 4 matrices, so rnnSize * 4.
    this.lstmKernel = tf.tensor2d(this.weights[4],
      [this.rnnSize + 5 + this.numWords, this.rnnSize * 4]);
    this.lstmBias = tf.tensor1d(this.weights[5]);

    this.rawVars = [
      this.inputKernel,
      this.inputBias,
      this.outputKernel,
      this.outputBias,
      this.lstmKernel,
      this.lstmBias
    ];

  }

  dispose() {
    if (this.rawVars) {
      for (let i = 0; i < this.rawVars.length; i++) {
        this.rawVars[i].dispose();
      }
      this.rawVars = undefined;
    }
    if (this.forgetBias) {
      this.forgetBias.dispose();
      this.forgetBias = undefined;
    }
  }

  /**
   * Given a dictionary of words, return the embedding
   * 
   * For instance, if the model.words is:
   * 
   * [dog, frog, bus, bird]
   * 
   * An input of {"frog": 1.0} will return [0, 1, 0, 0]
   * An input of {"dog": 0.8, "bus": 0.2} will return [0.8, 0, 0.2, 0]
   * 
   * An input of something that doesn't exist like {"ufo": 1.0}
   * will result in the zero embedding.
   * 
   * Note that the embeddings don't have to add up to one, though the
   * model was trained with one-hot embedding vectors.
   *
   * @param input dictionary of word choices and weights.
   *
   * @returns category embedding described above.
   */
  getEmbedding(input: { [index: string]: number }) {
    const result = new Float32Array(this.numWords);
    for (let i = 0; i < this.numWords; i++) {
      const weight = input[this.words[i]];
      if (weight !== undefined) {
        result[i] = weight;
      }
    }
    return result;
  }

  /**
   * Returns initial LSTM State, given the embedding
   *
   * @param category embedding of values (from getEmbedding())
   *
   * @returns initial LSTMState.
   */
  initialState(category: Float32Array) {
    const out = tf.tidy(() => {
      const x = tf.tensor2d(category, [1, this.numWords]);
      const state = tf.add(tf.matMul(x, this.inputKernel),
        this.inputBias)
        .squeeze();
      return state;
    });
    const result = new Float32Array(out.dataSync());
    out.dispose();
    return result;
  }

  /**
   * Returns the initial pen strokes of the model
   *
   * @returns [0, 0, 0, 1, 0].
   */
  initialInput() {
    return [0, 0, 0, 1, 0];
  }

  // private method that updates the lstm in tensor-land
  updateTensor(strokeInput: tf.Tensor2D,
    categoryInput: tf.Tensor2D,
    c: tf.Tensor2D,
    h: tf.Tensor2D) {
    const x = tf.concat([strokeInput, categoryInput], 1);
    const newState = tf.basicLSTMCell(
      this.forgetBias,
      this.lstmKernel,
      this.lstmBias,
      x,
      c,
      h);
    return newState;
  }

  /**
   * Updates the RNN, returns the next state.
   *
   * @param stroke [dx, dy, penDown, penUp, penEnd].
   * @param category embedding (from getEmbedding()).
   * @param state previous LSTMState.
   *
   * @returns next LSTMState.
   */
  update(stroke: number[], category:Float32Array, state: Float32Array) {
    const out = tf.tidy(() => {
      const s = this.scaleFactor;
      const normStroke =
        [stroke[0]/s, stroke[1]/s, stroke[2], stroke[3], stroke[4]];
      const strokeInput = tf.tensor2d(normStroke, [1, 5]);
      const categoryInput = tf.tensor2d(category, [1, this.numWords]);
      const [c, h] = tf.split(tf.tensor2d(state, [1, this.rnnSize * 2]), 2, 1);
      return tf.concat(this.updateTensor(strokeInput, categoryInput, c, h), 1);
    });
    const newState = new Float32Array(out.dataSync());
    out.dispose();
    return newState;
  }

  /**
   * Updates the RNN on a series of Strokes, returns the next state.
   *
   * @param strokes list of [dx, dy, penDown, penUp, penEnd].
   * @param category embedding (from getEmbedding()).
   * @param state previous LSTMState.
   * @param steps (Optional) number of steps of the stroke to update
   * (default is length of strokes list)
   *
   * @returns the final LSTMState.
   */
  updateStrokes(strokes: number[][],
    category:Float32Array,
    state: Float32Array,
    steps?: number) {
    const out = tf.tidy(() => {
      const s = this.scaleFactor;
      let normStroke:number[];
      let numSteps = strokes.length;
      if (steps !== undefined) {
        numSteps = steps;
      }
      let [c, h] = tf.split(tf.tensor2d(state, [1, this.rnnSize * 2]), 2, 1);
      let strokeInput: tf.Tensor2D;
      const categoryInput = tf.tensor2d(category, [1, this.numWords]);

      for (let i=0;i<numSteps;i++) {
        normStroke = [strokes[i][0]/s,
                      strokes[i][1]/s,
                      strokes[i][2],
                      strokes[i][3],
                      strokes[i][4]];
        strokeInput = tf.tensor2d(normStroke, [1, 5]);
        [c, h] = this.updateTensor(strokeInput, categoryInput, c, h);
      }
      return tf.concat([c, h], 1);
    });
    const finalState = new Float32Array(out.dataSync());
    out.dispose();
    return finalState;
  }

  // private method to sample next stroke in tensor-land.
  sampleTensor(h:tf.Tensor2D, sqrttemp:tf.Tensor, softtemp:tf.Tensor) {
    const z = tf.add(tf.matMul(h, this.outputKernel), this.outputBias)
      .squeeze();

    let [pen, output] = tf.split(z, [3, this.numOut-3]);
    // put x and y axis on top of each other to do the same op:
    output = tf.reshape(output, [2, this.numMixture * 3]);
    const [logmixRaw, mean, logstd] = tf.split(output, 3, 1);
    const logmix = tf.sub(logmixRaw, tf.logSumExp(logmixRaw, 1, true));
    const pi = logmix.div(softtemp); // unnormalized
    const mixIdx = tf.multinomial(pi.as2D(2, this.numMixture), 1).flatten();
    pen = pen.div(softtemp); // unnormalized
    const penIdx = tf.multinomial(pen.as1D(), 1).flatten();
    const std = tf.exp(logstd).mul(sqrttemp);
    const randomVars = tf.randomNormal([2, this.numMixture], 0, 1);
    const xy = tf.add(mean, tf.mul(std, randomVars));
    let [x, y] = tf.split(xy, 2, 0);
    const [xIdx, yIdx] = tf.split(mixIdx, 2);
    x = x.flatten().gather(xIdx);
    y = y.flatten().gather(yIdx);

    return tf.concat([x, y, tf.oneHot(penIdx.as1D(), 3).flatten()]).as2D(1, 5);
  }

  /**
   * Given the RNN state, calculates the probabilty distribution function,
   * and samples the next stroke from this calculated pdf.
   * 
   * Optionally adjust the temperature of the pdf here.
   *
   * @param state previous LSTMState.
   * @param temperature (Optional) for dx and dy (default 0.25)
   * @param softmaxTemperature (Optional) for Pi and Pen discrete states
   * (default is temperature * 0.5 + 0.5, which is a nice heuristic.)
   *
   * @returns stroke sampled from pdf
   */
  sample(state: Float32Array,
    temperature=0.25,
    softmaxTemperature?: number) {
    const temp = temperature;
    let discreteTemp: number = 0.5 + temp * 0.5; // good heuristic.
    if (softmaxTemperature) {
      discreteTemp = softmaxTemperature;
    }
    const out = tf.tidy(() => {

      const sqrttemp = tf.scalar(Math.sqrt(temp));
      const softtemp = tf.scalar(discreteTemp);

      // h is elment 1 of state. element 0 is c, which is discarded:
      const h = tf.split(tf.tensor2d(state, [1, this.rnnSize * 2]), 2, 1)[1];

      return this.sampleTensor(h, sqrttemp, softtemp).flatten();

    });
    const stroke = new Float32Array(out.dataSync());
    out.dispose();
    stroke[0] *= this.scaleFactor;
    stroke[1] *= this.scaleFactor;
    return stroke;
  }

  /**
   * Given the RNN state, generates a sequence of steps ahead.
   * 
   * Optionally adjust the temperature of the pdf here.
   *
   * @param state previous LSTMState.
   * @param category embedding (from getEmbedding()).
   * @param steps (Optional) number of steps to sample ahead
   * (default steps is 10)
   * @param temperature (Optional) for dx and dy (default 0.25)
   * @param softmaxTemperature (Optional) for Pi and Pen discrete states
   * (default is temperature * 0.5 + 0.5, which is a nice heuristic.)
   *
   * @returns stroke sampled from pdf
   */
  generate(state: Float32Array,
    category: Float32Array,
    steps: number,
    temperature=0.25,
    softmaxTemperature?: number) {
  
    const temp = temperature;
    let discreteTemp: number = 0.5 + temp * 0.5; // good heuristic.
    if (softmaxTemperature) {
      discreteTemp = softmaxTemperature;
    }
    let numSteps = 10;
    if (steps !== undefined) {
      numSteps = steps;
    }
  
    const out = tf.tidy(() => {

      let [c, h] = tf.split(tf.tensor2d(state, [1, this.rnnSize * 2]), 2, 1);
      const categoryInput = tf.tensor2d(category, [1, this.numWords]);

      let strokeInput: tf.Tensor2D;
      const strokeList: tf.Tensor2D[] = [];

      const sqrttemp = tf.scalar(Math.sqrt(temp));
      const softtemp = tf.scalar(discreteTemp);

      for(let i=0;i<numSteps;i++) {
        strokeInput = this.sampleTensor(h, sqrttemp, softtemp);
        [c, h] = this.updateTensor(strokeInput, categoryInput, c, h);
        strokeList.push(strokeInput);
      }

      return tf.concat(strokeList, 1);
    });
    const rawStrokes = out.dataSync();
    out.dispose();

    const strokes: number[][] = [];
    let stroke: number[];
    for(let i=0;i<numSteps;i++) {
      stroke = [0, 0, 0, 0, 0];
      for(let j=0;j<5;j++) {
        stroke[j] = rawStrokes[i*5+j];
      }
      stroke[0] *= this.scaleFactor;
      stroke[1] *= this.scaleFactor;
      strokes.push(stroke);
    }
    return strokes;

  }

  /**
   * Returns a new copy of the rnn state
   *
   * @param rnnState original LSTMState
   *
   * @returns copy of LSTMState
   */
  copyState(rnnState: Float32Array) {
    return new Float32Array(rnnState);
  }

  /**
   * Simplifies line using RDP algorithm
   *
   * @param line list of points [[x0, y0], [x1, y1], ...]
   * @param tolerance (Optional) default 2.0
   *
   * @returns simpified line [[x0', y0'], [x1', y1'], ...]
   */
  simplifyLine(line: number[][], tolerance?: number) {
    return support.simplifyLine(line, tolerance);
  }

  /**
   * Simplifies lines using RDP algorithm
   *
   * @param line list of lines (each element is [[x0, y0], [x1, y1], ...])
   * @param tolerance (Optional) default 2.0
   *
   * @returns simpified lines (each elem is [[x0', y0'], [x1', y1'], ...])
   */
  simplifyLines(lines: number[][][], tolerance?: number) {
    return support.simplifyLines(lines, tolerance);
  }

  /**
   * Convert from polylines to stroke-5 format that sketch-rnn uses
   *
   * @param lines list of points each elem is ([[x0, y0], [x1, y1], ...])
   *
   * @returns stroke-5 format of the line, list of [dx, dy, p0, p1, p2]
   */
  linesToStroke(lines: number[][][]) {
    return support.linesToStrokes(lines);
  }

  /**
   * Convert from a line format to stroke-5
   *
   * @param line list of points [[x0, y0], [x1, y1], ...]
   * @param lastPoint the absolute position of the last point
   *
   * @returns stroke-5 format of the line, list of [dx, dy, p0, p1, p2]
   */
  lineToStroke(line: number[][], lastPoint: number[]) {
    return support.lineToStroke(line, lastPoint);
  }

}
