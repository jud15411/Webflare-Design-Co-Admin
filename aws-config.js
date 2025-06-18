// AWS S3 Configuration from environment variables
const awsConfig = {
    region: window.env?.AWS_REGION || 'us-east-2',
    accessKeyId: window.env?.AWS_ACCESS_KEY_ID,
    secretAccessKey: window.env?.AWS_SECRET_ACCESS_KEY,
    bucketName: window.env?.AWS_S3_BUCKET || 'webflare-admin-contracts',
    s3Url: `https://${window.env?.AWS_S3_BUCKET || 'webflare-admin-contracts'}.s3.${window.env?.AWS_REGION || 'us-east-2'}.amazonaws.com`
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
    return new Promise((resolve, reject) => {
        const params = {
            Key: filePath,
            Body: file,
            ContentType: file.type || 'application/octet-stream',
            // Removed ACL to use bucket policy instead
            CacheControl: 'max-age=31536000', // Cache for 1 year
            ContentDisposition: 'inline', // Try to display in browser
            // Enable server-side encryption (recommended)
            ServerSideEncryption: 'AES256'
        };

        s3.upload(params, (err, data) => {
            if (err) {
                console.error('Error uploading file to S3:', err);
                reject(err);
            } else {
                console.log('File uploaded successfully:', data.Location);
                resolve(data);
            }
        });
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
window.AWSUtils = {
    uploadFile: uploadFileToS3,
    getSignedUrl: getSignedUrl,
    deleteFile: deleteFileFromS3,
    config: awsConfig
};
