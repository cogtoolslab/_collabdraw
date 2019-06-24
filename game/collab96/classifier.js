/**
 * Simple Convnet Classifier for QuickDraw Images
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
 * Main QuickDraw Classifier model class.
 *
 */
class QuickClassifier {
  /**
   * `QuickClassifier` constructor.
   *
   * @param weights list of arrays of flattened weight parameters.
   */
  constructor(weights) {
    // raw weights and dimensions directly from JSON
    this.weights = null; // Float32Array[];

    // TensorFlow.js weight tensors
    this.conv1Kernel = null;  //ms.tf.Tensor4D;
    this.conv1Bias = null;  //ms.tf.Tensor1D;
    this.conv2Kernel = null;  //ms.tf.Tensor4D;
    this.conv2Bias = null;  //ms.tf.Tensor1D;
    this.conv3Kernel = null;  //ms.tf.Tensor4D;
    this.conv3Bias = null;  //ms.tf.Tensor1D;
    this.conv4Kernel = null;  //ms.tf.Tensor4D;
    this.conv4Bias = null;  //ms.tf.Tensor1D;
    this.outputKernel = null;  //ms.tf.Tensor2D;
    this.outputBias = null;  //ms.tf.Tensor1D;

    this.rawVars = null;  //ms.tf.Tensor[];

    let rawWeights;

    this.weights = [];
    for (let i = 0; i < weights.length; i++) {
      rawWeights = new Float32Array(weights[i]);
      const N = rawWeights.length;
      for (let j = 0; j < N; j++) {
        rawWeights[j] = rawWeights[j] / 10000;
      }
      this.weights.push(rawWeights);
    }

    this.conv1Kernel = ms.tf.tensor4d(this.weights[0], [4,4,1,32]);
    this.conv1Bias = ms.tf.tensor1d(this.weights[1]);
    this.conv2Kernel = ms.tf.tensor4d(this.weights[2], [4,4,32,64]);
    this.conv2Bias = ms.tf.tensor1d(this.weights[3]);
    this.conv3Kernel = ms.tf.tensor4d(this.weights[4], [4,4,64,128]);
    this.conv3Bias = ms.tf.tensor1d(this.weights[5]);
    this.conv4Kernel = ms.tf.tensor4d(this.weights[6], [4,4,128,256]);
    this.conv4Bias = ms.tf.tensor1d(this.weights[7]);
    this.outputKernel = ms.tf.tensor2d(this.weights[8], [1024,96]); // 2nd dim of 2nd arg is number of alternatives
    this.outputBias = ms.tf.tensor1d(this.weights[9]);

    this.rawVars = [
      this.conv1Kernel,
      this.conv1Bias,
      this.conv2Kernel,
      this.conv2Bias,
      this.conv3Kernel,
      this.conv3Bias,
      this.conv4Kernel,
      this.conv4Bias,
      this.outputKernel,
      this.outputBias
    ];
  }

  dispose() {
    if (this.rawVars) {
      for (let i = 0; i < this.rawVars.length; i++) {
        this.rawVars[i].dispose();
      }
      this.rawVars = undefined;
    }
  }

  /**
   * Makes a prediction of a 64x64x1 image. Returns probability distribution.
   *
   * @param rawImage flattened 64x64 pixel image as Float32Array (0.0 to 1.0).
   *
   * @returns probability distribution vector (should sum up to 1.0).
   */
  predict(rawImage) {
    const out = ms.tf.tidy(() => {
      const x = ms.tf.tensor4d(rawImage, [1, 64, 64, 1]);
      let h = ms.tf.conv2d(x, this.conv1Kernel, 2, 'valid');
      h = ms.tf.add(h, this.conv1Bias);
      h = ms.tf.relu(h);

      h = ms.tf.conv2d(h, this.conv2Kernel, 2, 'valid');
      h = ms.tf.add(h, this.conv2Bias);
      h = ms.tf.relu(h);

      h = ms.tf.conv2d(h, this.conv3Kernel, 2, 'valid');
      h = ms.tf.add(h, this.conv3Bias);
      h = ms.tf.relu(h);

      h = ms.tf.conv2d(h, this.conv4Kernel, 2, 'valid');
      h = ms.tf.add(h, this.conv4Bias);
      h = ms.tf.relu(h);

      const final = ms.tf.reshape(h, [1, 2*2*256]);
      const logits = ms.tf.add(ms.tf.matMul(final, this.outputKernel),
        this.outputBias).squeeze();

      return ms.tf.softmax(logits);

    });
    const probVector = new Float32Array(out.dataSync());
    out.dispose();
    return probVector;
  }
}
window.mc = {};
window.mc.QuickClassifier = QuickClassifier;
