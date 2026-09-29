import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type MealPhoto = { uri: string; base64: string; mimeType: string };

/** Long side of the photo sent to the model. */
const MAX_PHOTO_PX = 1024;

/**
 * Camera or library → a downscaled JPEG ready for `POST /ai/parse`.
 * Resolves `null` when the user backs out, a string when there is something to
 * tell them. Call it straight from a tap handler: the web file dialog only
 * opens inside a user gesture.
 */
export async function pickMealPhoto(camera: boolean): Promise<MealPhoto | string | null> {
  if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
    return 'Camera access is off — allow it in Settings, or upload a photo instead.';
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  // A phone photo is ~2–3 MB; 1024 px on the long side is ~150 KB and the model
  // reads it just as well — about 15x less to upload and ~2 s less for the model.
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_PHOTO_PX) {
    context.resize(asset.width >= asset.height ? { width: MAX_PHOTO_PX } : { height: MAX_PHOTO_PX });
  }
  const image = await context
    .renderAsync()
    .then((ref) => ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true }))
    .catch(() => null);
  if (!image?.base64) return 'Could not read that photo — try another.';
  return { uri: image.uri, base64: image.base64, mimeType: 'image/jpeg' };
}
