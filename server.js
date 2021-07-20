const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const WavEncoder = require('wav-encoder')
const fs = require('fs')
const app = express()
const wavDecoder = require('wav-decoder');

app.get('/', (req, res) => {
    res.redirect('audio');
})
app.use('/audio', express.static(path.join(__dirname, 'public')))

app.get('/video', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/video.htm'))
  });


app.get('/videos', function (req, res) {
    const path = 'assets/sample.mp4';
  
    function holdBeforeFileExists(filename, timeout = 2000) {
      timeout = timeout < 1000 ? 1000 : timeout;
      return new Promise((resolve) => {
        // var timer = setTimeout(function () {
        //   resolve();
        // }, timeout);
        var inter = setInterval(function () {
          if (fs.existsSync(filename) && fs.lstatSync(filename).isFile()) {
            console.log('exists');
            clearInterval(inter);
            clearTimeout(timer);
            resolve();
          }
        }, 1000);
      });
    }
  
    const promise = new Promise((resolve, reject) => {
      var inter = setInterval(function () {
        if (fs.existsSync(path) && fs.lstatSync(path).isFile()) {
          let filename = path;
          console.log('exists');
          clearInterval(inter);
          resolve(filename);
        }
      }, 1000);
    }).then(value => {
      console.log(value);
      const stat = fs.statSync(value)
      const fileSize = stat.size
      const range = req.headers.range
  
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
          ? parseInt(parts[1], 10)
          : fileSize - 1
  
        if (start >= fileSize) {
          res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
          return
        }
  
        const chunksize = (end - start) + 1
        const file = fs.createReadStream(value, { start, end })
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        }
  
        res.writeHead(206, head)
        file.pipe(res)
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(value).pipe(res)
      }
  
    }).catch(err => {
      console.log('Something Went Wrong');
      console.log(err);
    })
  
    // holdBeforeFileExists(path);
});

server = http.createServer(app).listen(3000, function() {
    console.log('Example app listening on port 3000')
})

const io = socketio.listen(server)
 
io.on('connection', (socket) => {
    socket.id = new Date().toISOString();
    console.log(socket.id);
    let sampleRate = 48000
    let date;
    let serverDate;
    let buffer = []

    socket.on('start', (data) => {
        sampleRate = data.sampleRate
        serverDate = new Date().toISOString();
        date = data.date;
        console.log(`Sample Rate: ${sampleRate}`)
    })

    socket.on('send_pcm', (data) => {
        // data: { "1": 11, "2": 29, "3": 33, ... }
        let filename = path.join(__dirname, `public/wav/S${ serverDate }.wav`);
        let client = path.join(__dirname, `public/wav/C${ date }-S${ serverDate }.txt`);

        const itr = data.values();
        const buf = new Array(data.length);

        for (var i = 0; i < buf.length; i++) {
            buf[i] = itr.next().value;
        }
        buffer = buffer.concat(buf);


        const f32array = toF32Array(buffer);
        exportWAV(f32array, sampleRate, filename, client);
        console.log('save');
        
    })

    socket.on('stop', (data, ack) => {
        // const f32array = toF32Array(buffer)
        // const filename = `public/wav/${String(Date.now())}.wav`
        // exportWAV(f32array, sampleRate, filename)
        // ack({ filename: filename })
        console.log('good bye');
    })
    socket.on('disconnect', () => {
        // const f32array = toF32Array(buffer)
        // const filename = `public/wav/${String(Date.now())}.wav`
        // exportWAV(f32array, sampleRate, filename)
        console.log('good bye');
    })
})

// Convert byte array to Float32Array
const toF32Array = (buf) => {
    const buffer = new ArrayBuffer(buf.length)
    const view = new Uint8Array(buffer)
    for (var i = 0; i < buf.length; i++) {
        view[i] = buf[i]
    }
    return new Float32Array(buffer)
}

// data: Float32Array
// sampleRate: number
// filename: string
const exportWAV = (data, sampleRate, filename, textFilename) => {
    const audioData = {
        sampleRate: sampleRate,
        channelData: [data]
    }
    WavEncoder.encode(audioData).then((buffer) => {
        fs.writeFile(filename, Buffer.from(buffer), (e) => {
            if (e) {
                console.log(e)
            } else {
                console.log(`Successfully saved ${filename}`)
            }
        });

        fs.writeFile(textFilename, '', (e) => {
          if(e) {
            console.log(e);
          } else {
            console.log(`saved text ${ textFilename }`);
          }
        })
    })
}

const readfile = (filepath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filepath, (err, buffer) => {
            if(err) {
                return reject(err);
            }
            return resolve(buffer);
        });
    });
};

// const importWav = (filename) => {
//     readfile(filename).then(buffer => {
//         return wavDecoder.decode(buffer);
//     }).then(audioData => {
//         return audioData.channelData;
//     })
// }