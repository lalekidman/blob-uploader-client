import {Request, Response, NextFunction, Router} from 'express'
import HttpStatus from 'http-status-codes'
import fs from 'fs'
import Busboy from 'busboy'
const multiPartMiddleWare = require('connect-multiparty')()
const mediaPattern = /^(image\/png|video\/mp4)$/i
const blobLoc = __dirname.concat(`/../../../../uploads`)
const getBlobpath = (fileId: string) => {
  return `${blobLoc}/${fileId}`
}
// const storage = multer.diskStorage({
//   destination: (req, file, callback) => {
//     callback(null, __dirname.concat('/../../../../uploads'))
//   },
//   filename: (req, file, callback) => {
//     const fileId = req.headers['x-file-id']
//     callback(null, `${file.destination}/${fileId}`)
//   }
// })
// const uploader = multer({storage})
export const BlobUploaderMiddleware = (req: Request, res: Response, next: NextFunction) => {
  var busboy = new Busboy({ headers: req.headers });
  const fileId = req.headers['x-file-id'] as string
  const fileSize = parseInt(req.headers['x-file-size'] as string)
  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    const blobFlag = fs.existsSync(getBlobpath(fileId)) ? 'a' : 'w'
    file.pipe(fs.createWriteStream(getBlobpath(fileId), {flags: blobFlag}));
    file.on('end', function() {
      const stats = fs.statSync(getBlobpath(fileId))
      if (stats.size === fileSize) {
        req.file = {
          filename,
          fieldname,
          encoding,
          mimetype,
          //@ts-expect-error
          location: blobLoc,
          path: getBlobpath(fileId),
        }
        console.log('####ccccc######################3 SHOULD CALL NEXT ROUTE');
        next()
        return
      } else {
        res.sendStatus(HttpStatus.ACCEPTED)
        console.log('########################## SHOULD CALL RESPONSE HTTP');
      }
    });
  });
  req.pipe(busboy)
}

export const BlobTotalLoaded = (req: Request, res: Response, next: NextFunction) => {
  const {fileId} = req.query
  if (!(fs.existsSync(getBlobpath(fileId)))) {
    res.status(HttpStatus.BAD_GATEWAY).send({error: "No blob found."})
  }
  const blobStats = fs.statSync(getBlobpath(fileId))
  res.status(HttpStatus.OK).json({
    totalBytesUploaded: blobStats.size
  })
}