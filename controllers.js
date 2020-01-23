const axios = require('axios')
const objectID = require('mongodb').ObjectID
const { applyMiddleware } = require('./middleware')
const connectToDatabase = require('./db')
const models = require('./models')
const Chirp = models.Chirp

module.exports.ping = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Pong!',
      // event, // useful debug
    }),
  }
}

module.exports.createChirp = applyMiddleware((event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false
  let postedChirp
  try {
    postedChirp = JSON.parse(event.body)
  } catch (err) {
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        name: err.name,
        code: 400,
        message: err.message,
      })
    })
  }

  connectToDatabase()
    .then(() => {
      Chirp.create({
        ...postedChirp,
        created: Date.now(),
        votes: 0,
      })
        .then(chirp => {
          // fire and forget notification
          axios.post('https://bellbird.joinhandshake-internal.com/', { chirp_id: chirp.id });
  
          // api response
          return callback(null, {
            statusCode: 200,
            body: JSON.stringify(chirp)
          })
        })
        .catch(err => {
          let code = err.statusCode || 500
          if (err.name === 'ValidationError') {
            code = 400
          }
          return callback(null, {
            statusCode: code,
            body: JSON.stringify({
              name: err.name,
              code,
              message: err.message,
            })
          })
        })
    })
})

module.exports.getChirp = applyMiddleware((event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  const id = event.pathParameters.id
  if (!objectID.isValid(id)) {
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        name: 'RequestError',
        code: 400,
        message: 'invalid value supplied for id',
      })
    })
  }

  connectToDatabase()
    .then(() => {
      Chirp.findById(id)
        .then(chirp => {
          if (!chirp) {
            return callback(null, {
              statusCode: 404,
              body: JSON.stringify({
                name: 'NotFound',
                code: 404,
                message: `chirp id ${id} was not found`,
              })
            })
          }
          return callback(null, {
            statusCode: 200,
            body: JSON.stringify(chirp)
          })
        })
        .catch(err => callback(null, {
          statusCode: err.statusCode || 500,
          body: JSON.stringify({
            name: err.name,
            code: err.statusCode || 500,
            message: err.message,
          })
        }))
    })
})

module.exports.getChirps = applyMiddleware((event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  connectToDatabase()
    .then(() => {
      Chirp.find()
        .sort({'created': 'desc'})
        .then(chirps => callback(null, {
          statusCode: 200,
          body: JSON.stringify(chirps)
        }))
        .catch(err => callback(null, {
          statusCode: err.statusCode || 500,
          body: JSON.stringify({
            name: err.name,
            code: err.statusCode || 500,
            message: err.message,
          })
        }))
    })
})

module.exports.updateChirp = applyMiddleware((event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  const id = event.pathParameters.id
  if (!objectID.isValid(id)) {
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        name: 'RequestError',
        code: 400,
        message: 'invalid value supplied for id',
      })
    })
  }

  let update
  try {
    update = JSON.parse({
      ...event.body,
      updated: Date.now(),
    })
  } catch (err) {
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        name: err.name,
        code: 400,
        message: err.message,
      })
    })
  }

  connectToDatabase()
    .then(() => {
      Chirp.findByIdAndUpdate(id, update, { new: true })
        .then(chirp => callback(null, {
          statusCode: 200,
          body: JSON.stringify(chirp)
        }))
        .catch(err => {
          let code = err.statusCode || 500
          if (err.name === 'ValidationError') {
            code = 400
          }
          return callback(null, {
            statusCode: code,
            body: JSON.stringify({
              name: err.name,
              code,
              message: err.message,
            })
          })
        })
    })
})

module.exports.upvoteChirp = applyMiddleware((event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  const id = event.pathParameters.id
  if (!objectID.isValid(id)) {
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        name: 'RequestError',
        code: 400,
        message: 'invalid value supplied for id',
      })
    })
  }

  // get chirp
  connectToDatabase()
    .then(() => {
      Chirp.findById(id)
        .then(chirp => {
          if (!chirp) {
            return callback(null, {
              statusCode: 404,
              body: JSON.stringify({
                name: 'NotFound',
                code: 404,
                message: `chirp id ${id} was not found`,
              })
            })
          }
          try {
            console.log('try to json parse update')
            update = {
              votes: (chirp.votes || 0) + 1,
              updated: Date.now(),
            };
          } catch (err) {
            return callback(null, {
              statusCode: 400,
              body: JSON.stringify({
                name: err.name,
                code: 400,
                message: err.message,
              })
            })
          }
          console.log('find and update chirp')
          Chirp.findByIdAndUpdate(id, update, { new: true })
            .then(chirp => callback(null, {
              statusCode: 200,
              body: JSON.stringify(chirp)
            }))
            .catch(err => {
              let code = err.statusCode || 500
              if (err.name === 'ValidationError') {
                code = 400
              }
              return callback(null, {
                statusCode: code,
                body: JSON.stringify({
                  name: err.name,
                  code,
                  message: err.message,
                })
              })
            })
        })
        .catch(err => callback(null, {
          statusCode: err.statusCode || 500,
          body: JSON.stringify({
            name: err.name,
            code: err.statusCode || 500,
            message: err.message,
          })
        }))
    })
  //
})

module.exports.deleteChirp = applyMiddleware((event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  const id = event.pathParameters.id
  if (!objectID.isValid(id)) {
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        name: 'RequestError',
        code: 400,
        message: 'invalid value supplied for id',
      })
    })
  }

  connectToDatabase()
    .then(() => {
      Chirp.findByIdAndRemove(id)
        .then(chirp => callback(null, {
          statusCode: 200,
          body: JSON.stringify({ message: 'Removed chirp with id: ' + chirp._id, chirp: chirp })
        }))
        .catch(err => callback(null, {
          statusCode: err.statusCode || 500,
          body: JSON.stringify({
            name: err.name,
            code: err.statusCode || 500,
            message: err.message,
          })
        }))
    })
})
