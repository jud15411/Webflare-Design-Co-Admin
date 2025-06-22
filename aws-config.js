// AWS S3 Configuration from environment variables
const getEnvVar = (key, defaultValue = '') => {
    if (typeof window !== 'undefined' && window.env && window.env[key] !== undefined) {
        return window.env[key];
    }
    if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
        return process.env[key];
    }
    return defaultValue;
};

const awsConfig = {
    region: getEnvVar('AWS_REGION', 'us-east-2'),
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY'),
    bucketName: getEnvVar('AWS_S3_BUCKET', 'webflare-admin-contracts'),
    get s3Url() {
        return `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
    }
};

// Validate required configuration
const validateConfig = () => {
    const required = ['accessKeyId', 'secretAccessKey'];
    const missing = [];
    
    for (const key of required) {
        if (!awsConfig[key]) {
            missing.push(key);
        }
    }
    
    if (missing.length > 0) {
        const errorMsg = `Missing required AWS configuration: ${missing.join(', ')}`;
        console.error(errorMsg);
        if (window.env?.NODE_ENV === 'production') {
            throw new Error(errorMsg);
        }
        return false;
    }
    return true;
};

// Validate the configuration when the script loads
validateConfig();

// Initialize AWS SDK
const AWS = window.AWS || {};
AWS.config.update({
    region: awsConfig.region,
    credentials: new AWS.Credentials({
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey
    })
});

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: awsConfig.bucketName }
});

// Function to upload file to S3
async function uploadFileToS3(file, filePath) {
    console.log('Starting file upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        filePath: filePath
    });

    return new Promise((resolve, reject) => {
        try {
            const params = {
                Bucket: awsConfig.bucketName,
                Key: filePath,
                Body: file,
                ContentType: file.type || 'application/octet-stream',
                CacheControl: 'max-age=31536000',
                ContentDisposition: 'inline',
                ServerSideEncryption: 'AES256',
                Metadata: {
                    'original-filename': file.name
                }
            };

            console.log('Uploading with params:', {
                Bucket: params.Bucket,
                Key: params.Key,
                ContentType: params.ContentType,
                Size: file.size
            });

            const uploader = s3.upload(params);
            
            // Track upload progress
            uploader.on('httpUploadProgress', (progress) => {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                console.log(`Upload progress: ${percent}%`);
            });

            uploader.send((err, data) => {
                if (err) {
                    console.error('Error details:', {
                        code: err.code,
                        statusCode: err.statusCode,
                        message: err.message,
                        region: err.region,
                        time: new Date().toISOString(),
                        requestId: err.requestId,
                        extendedRequestId: err.extendedRequestId
                    });
                    
                    // Provide more user-friendly error messages
                    let errorMessage = 'Upload failed';
                    if (err.code === 'AccessDenied') {
                        errorMessage = 'Permission denied. Check your AWS credentials and bucket policy.';
                    } else if (err.code === 'NoSuchBucket') {
                        errorMessage = `Bucket ${awsConfig.bucketName} does not exist.`;
                    } else if (err.statusCode === 403) {
                        errorMessage = 'Access forbidden. Check your bucket policy and CORS configuration.';
                    }
                    
                    reject(new Error(`${errorMessage} (${err.code || 'Unknown error'})`));
                } else {
                    console.log('Upload successful:', {
                        location: data.Location,
                        key: data.Key,
                        etag: data.ETag,
                        bucket: data.Bucket
                    });
                    resolve(data);
                }
            });
        } catch (error) {
            console.error('Unexpected error in uploadFileToS3:', error);
            reject(new Error(`Upload failed: ${error.message}`));
        }
    });
}

// Function to get a signed URL for viewing/accessing the file
async function getSignedUrl(fileKey, expiresIn = 3600) {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: awsConfig.bucketName,
            Key: fileKey,
            Expires: expiresIn // URL expiration time in seconds (1 hour by default)
        };

        s3.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                console.error('Error generating signed URL:', err);
                reject(err);
            } else {
                resolve(url);
            }
        });
    });
}

// Function to delete a file from S3
async function deleteFileFromS3(fileKey) {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: awsConfig.bucketName,
            Key: fileKey
        };

        s3.deleteObject(params, (err, data) => {
            if (err) {
                console.error('Error deleting file from S3:', err);
                reject(err);
            } else {
                console.log('File deleted successfully:', fileKey);
                resolve(data);
            }
        });
    });
}

// Export the functions
const AWSUtils = {
    uploadFile: uploadFileToS3,
    getSignedUrl: getSignedUrl,
    deleteFile: deleteFileFromS3,
    config: awsConfig
};

// Make available globally
window.AWSUtils = AWSUtils;

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AWSUtils;
}
