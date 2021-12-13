const fs = require('fs');
const path = require('path');
const IPFS = require('ipfs-core');
const pubNfts = path.join(process.cwd(), 'public/assets');
const outNfts = path.join(process.cwd(), 'nfts.json');

function readDirectory(dir) {
  return fs.readdirSync(dir).filter((file) => {
    return !/^\./.test(file);
  });
}

IPFS.create().then(async (ipfs) => {
  const files = readDirectory(pubNfts);
  const nfts = {};

  let i = 1;

  while (files.length) {
    const file = files.pop();
    const { cid } = await ipfs.add({
      content: fs.readFileSync(path.join(pubNfts, file)),
    });
    const mime = file.split('.').pop().replace('.', '');
    const name = `${file.replace(/\.(svg|png|jpg|jpeg)$/, '')}#${mime}`;
    const type = `image/${mime}`;
    // const tags = [];
    const image = `ipfs://ipfs/${cid}`;
    const ident = `PP${i}`;
    // const opts = {
    //   archive: true,
    //   compress: true,
    //   compressionLevel: 1,
    // };

    nfts[ident] = {
      name,
      // tags,
      type,
      image,
    };

    i++;
  }

  fs.writeFileSync(outNfts, JSON.stringify([nfts], null, 2));

  process.exit(0);
});