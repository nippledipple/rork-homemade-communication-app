export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const generateKeyPair = async (): Promise<KeyPair> => {
  // Simplified key generation for demo
  // In production, use proper crypto library like @signalapp/libsignal-protocol-typescript
  
  // Generate random strings for React Native compatibility
  const generateRandomString = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const publicKey = generateRandomString(44); // Base64-like string
  const privateKey = generateRandomString(44);
  
  return {
    publicKey,
    privateKey,
  };
};

export const encryptMessage = async (message: string, publicKey: string): Promise<string> => {
  // Simplified encryption for demo
  // In production, use proper Signal protocol
  // Using base64 encoding for React Native compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const base64 = Buffer.from(data).toString('base64');
  return base64;
};

export const decryptMessage = async (encrypted: string, privateKey: string): Promise<string> => {
  // Simplified decryption for demo
  // In production, use proper Signal protocol
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
    return decoded;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};