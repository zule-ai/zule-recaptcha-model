import * as tf from '@tensorflow/tfjs';

/**
 * Augments a single image tensor into multiple variations.
 * @param {tf.Tensor} tensor - Original image tensor.
 * @returns {Array<tf.Tensor>} Array of augmented tensors.
 */
export function augmentTensor(tensor: tf.Tensor3D): tf.Tensor3D[] {
    return tf.tidy(() => {
        const augmented: tf.Tensor3D[] = [];

        // 1. Original\
        augmented.push(tensor.clone());

        // 2. Brightness variation
        const brightnessFactor = (Math.random() - 0.5) * 0.4;
        const brightTensor = tf.add(tensor, tf.scalar(brightnessFactor)).clipByValue(0, 1) as tf.Tensor3D;
        augmented.push(brightTensor);

        // 3. Gaussian Noise
        const noise = tf.randomNormal(tensor.shape, 0, 0.03);
        const noisyTensor = tf.add(tensor, noise).clipByValue(0, 1) as tf.Tensor3D;
        augmented.push(noisyTensor);

        return augmented;
    });
}
