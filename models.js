const mongoose = require('mongoose')

const ChirpSchema = new mongoose.Schema({  
  id: { type: String },
  text: { type: String, required: [true, 'required']},
  votes: { type: Number },
  created: { type: Number },
  updated: { type: Number },
})

module.exports = {
  Chirp: mongoose.model('Chirp', ChirpSchema)
}
