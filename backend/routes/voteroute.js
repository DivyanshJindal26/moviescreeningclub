const express = require('express')
const router = express.Router()
const {
  getAllMovies,
  voteMovie,
  addVoteMovie,
  deleteVoteMovie
} = require('@/controllers/vote.controller')
const { verifyJWTWithRole } = require('@/middleware')

router.get('/movies', getAllMovies)

router.post('/', verifyJWTWithRole(), voteMovie)
router.post('/add', verifyJWTWithRole('movievolunteer'), addVoteMovie)
router.post(
  '/delete/:id',
  verifyJWTWithRole('movievolunteer'),
  deleteVoteMovie
)

module.exports = router
