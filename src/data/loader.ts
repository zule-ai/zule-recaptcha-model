import * as tf from '@tensorflow/tfjs';
import { promises as fs } from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import CONFIG from '@/config/default';
import { augmentTensor } from './pipeline';
import logger from '@/utils/logger';
import { Sample, Dataset } from '@/types';

/**
 * Loads and preprocesses images from a directory.
 */
export async function loadImagesFromDir(dirPath: string, label: number): Promise<Sample[]> {
    try {
        const files = await fs.readdir(dirPath);
        const images: Sample[] = [];

        logger.info(`Loading images from ${dirPath}...`);

        for (const file of files) {
            if (file.startsWith('.')) continue;

            const imgPath = path.join(dirPath, file);
            try {
                const img = await loadImage(imgPath);
                const canvas = createCanvas(CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);

                // Explicitly cast the returned tensor to Tensor3D and reshape
                const baseTensor = tf.browser.fromPixels(canvas as any)
                    .toFloat()
                    .div(tf.scalar(255.0))
                    .reshape([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE, 3]) as tf.Tensor3D;

                images.push({ tensor: baseTensor, label, file, isAugmented: false });
            } catch (err) {
                // Silently fail for non-images
            }
        }

        return images;
    } catch (err: any) {
        logger.error(`Error reading directory ${dirPath}: ${err.message}`);
        throw err;
    }
}

/**
 * Loads and prepares the dataset for training, including augmentation.
 */
export async function loadDataset(): Promise<Dataset> {
    logger.info('Initializing dataset loading sequence...');
    try {
        const correct = await loadImagesFromDir(CONFIG.PATHS.DATA_CORRECT, 1);
        const incorrect = await loadImagesFromDir(CONFIG.PATHS.DATA_INCORRECT, 0);
        const all = correct.concat(incorrect);

        if (all.length === 0) {
            throw new Error("No images found in data directories. Please add training images.");
        }

        logger.info(`Found ${all.length} original samples. Performing augmentation...`);

        let augmentedSamples: Sample[] = [];
        for (const item of all) {
            const augmentedTensors = augmentTensor(item.tensor);
            item.tensor.dispose();

            augmentedTensors.forEach((augTensor, idx) => {
                augmentedSamples.push({
                    tensor: augTensor,
                    label: item.label,
                    file: `${item.file}_aug_${idx}`
                });
            });
        }

        // Shuffle
        augmentedSamples = augmentedSamples.sort(() => Math.random() - 0.5);

        logger.info(`Total training samples after augmentation: ${augmentedSamples.length}`);

        const xs = tf.stack(augmentedSamples.map(i => i.tensor));
        const ys = tf.tensor(augmentedSamples.map(i => i.label)).reshape([augmentedSamples.length, 1]);

        logger.info('Dataset tensors prepared.');
        return { xs, ys, samples: augmentedSamples };
    } catch (err: any) {
        logger.error('Failed to load dataset:', err.message);
        throw err;
    }
}
