const fs = require('fs');
const path = require('path');
const IPFS = require('ipfs-core');
const pubNfts = path.join(process.cwd(), 'assets');
const outNfts = path.join(process.cwd(), 'nfts.json');

function readDirectory(dir) {
  return fs.readdirSync(dir).filter((file) => {
    return !/^\./.test(file);
  });
}

IPFS.create().then(async (ipfs) => {
  const files = readDirectory(pubNfts);
  const nfts = {};

  while (files.length) {
    const file = files.pop();
    const { cid } = await ipfs.add({
      content: fs.readFileSync(path.join(pubNfts, file)),
    });
    const mime = file.split('.').pop().replace('.', '');
    const name = file.replace(/(-|_)|\.(png|jpg|jpeg)$/g, (match) => {
      return /-|_/.test(match) ? ' ' : '';
    });
    const type = `image/${mime}`;
    const tags = [];
    const image = `ipfs://ipfs/${cid}`;
    // const opts = {
    //   archive: true,
    //   compress: true,
    //   compressionLevel: 1,
    // };

    nfts[file] = {
      name,
      tags,
      type,
      image,
    };
  }

  fs.writeFileSync(outNfts, JSON.stringify([nfts], null, 2));

  process.exit(0);
});