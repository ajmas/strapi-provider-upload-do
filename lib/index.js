"use strict";
import { S3, PutObjectCommand } from '@aws-sdk/client-s3';
import { URL } from 'url';

class FileLocationConverter {
  config = {};

  constructor(config) {
    this.config = config;
  }

  getKey(file) {
    const filename = `${file.hash}${file.ext}`;
    if (!this.config.directory) {
      return filename;
    }
    return `${this.config.directory}/${filename}`;
  }

  getUrl(data) {
    if (!this.config.cdn) {
      return data.Location;
    }
    const url = new URL(this.config.cdn);
    url.protocol = 'https';
    url.pathname = data.Key;
    return url.toString();
  }
}

const ACL = 'public-read';
const CacheControl = 'public, max-age=31536000, immutable';
let s3;
let converter;
let pluginConfig = {};

async function uploadFile (file) {
  const bucketParams = {
    Bucket: pluginConfig.Spaces,
    Key: converter.getKey(file),
    Body: Buffer.from(file.buffer, 'binary'),
    ACL,
    CacheControl,
    ContentType: file.mime
  };

  await s3.send(new PutObjectCommand(bucketParams));
}

async function deleteFile (file) {
  return s3.deleteObject({
    Bucket: pluginConfig.Spaces,
    Key: converter.getKey(file)
  });
}

export default {
  provider: 'do',
  name: 'Digital Ocean Spaces',
  auth: {
    key: {
      label: 'Key',
      type: 'text'
    },
    secret: {
      label: 'Secret',
      type: 'text'
    },
    endpoint: {
      label: 'Endpoint (e.g. \'fra1.digitaloceanspaces.com\')',
      type: 'text',
    },
    cdn: {
      label: 'CDN Endpoint (Optional - e.g. \'https://cdn.space.com\')',
      type: 'text',
    },
    space: {
      label: 'Space (e.g. myspace)',
      type: 'text',
    },
    directory: {
      label: 'Directory (Optional - e.g. directory - place when you want to save files)',
      type: 'text'
    }
  },
  init (config) {
    pluginConfig = config;
    converter = new FileLocationConverter(config);

    s3 = new S3({
      endpoint: config.endpoint,
      region: undefined,
      credentials: {
        accessKeyId: config.key,
        secretAccessKey: config.secret
      }
    });

    return {
      upload: uploadFile,
      delete: deleteFile
    };
  }
};
