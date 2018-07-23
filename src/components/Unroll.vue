<template lang='pug'>
.unroll
  h1 UNROLL
  h3 Upload a file
  p
    span(style='margin-right: 1em') Example (Carolina Shout)
    a(href='/static/carolina_shout.mid' style='margin-right: 1em' title='Download')
      el-button(icon='el-icon-download' circle)
    el-button(icon='el-icon-news' @click="loadExample('/static/carolina_shout.mid')" circle title='Use')
  el-upload(:file-list='midiFile',
            :on-change='parseMidi',
            :multiple='false',
            :auto-upload="false",
            action=''
            drag)
    i.el-icon-upload
    .el-upload__text Drop a MIDI file here or <em>click to upload</em>
  div(v-if='midiName')
    h2 {{midiName}}
    hr
  div(v-if='midiData')
    h3 Segment
    el-row(style='max-width: 800px; margin: 0 auto;')
      el-col(:span='4')
        div(style='margin-top: 0.5em;') {{seconds2minutes(segment[0])}}
      el-col(:span='16')
        el-slider(v-model='segment', :min='0', :max='midiData.duration',
                  :show-tooltip='false' range)
      el-col(:span='4')
        div(style='margin-top: 0.5em;') {{seconds2minutes(segment[1])}}
  div(v-if='scalePlotData')
    h3 Separation Note
    el-select(v-model='separationNote')
      el-option(v-for='sep in separationNotes', :value='sep.midi',
                :label='sep.name', :key='sep.name')
  div(v-if='tempoPlotData')
    h3 Tempo
    el-input-number(v-model='tempo')
    .tempo-plot
      chartist(type='Line', :data='tempoPlotData' , :options='tempoPlotOptions')
  div(v-if='scalePlotData' align='center')
    h3 Scale
    el-input(v-model='selectedScale' style='width: 100px')
    .scale-plot
      chartist(type='Bar', :data='scalePlotData' , :options='scalePlotOptions')
    p(v-for='scale, i in detectedScales', :key='i') {{scale}}
  div(v-if='handsMidi')
    hr
  div(v-if='handsMidi')
    h3 Midi Files
    el-button(@click="download(midiName + '_left.mid', handsMidi.left)") Left Hand
    el-button(@click="download(midiName + '_right.mid', handsMidi.right)") Right Hand
  div(v-if='handsLily')
    h3 Lilypond Score
    el-button(@click="download(midiName + '.ly', handsLily)") Full Score

  #staves
</template>

<script>
import { Note } from 'tonal'
const Vex = require('vexflow')
const MidiConvert = require('midiconvert')
const Detect = require('tonal-detector')
const download = require('downloadjs')
const lilyTemplate = require('../assets/lilyTemplate.txt')

export default {
  name: 'unroll',
  data () {
    var separationNotes = []
    for (var i = 55; i < 65; i++) {
      separationNotes.push({
        name: Note.fromMidi(i),
        midi: i
      })
    }
    return {
      midiName: null,
      midiFile: [],
      notes: [],
      midiData: null,
      tempo: 100,
      separationNote: 60,
      hands: null,
      quantizedHands: null,
      handsMidi: null,
      handsLily: null,
      separationNotes: separationNotes,
      segment: [0, 1000],
      detectedScales: [],
      selectedScale: null,
      tempoPlotData: null,
      tempoPlotOptions: {
        lineSmooth: false,
        axisX: {
          showGrid: true,
          labelInterpolationFnc: function skipLabels (value, index) {
            return index % 10 === 0 ? value : null
          }
        },
        axisY: {
          showGrid: false,
          showLabel: false
        },
        showPoint: false
      },
      scalePlotData: null,
      scalePlotOptions: {
        horizontalBars: true,
        seriesBarDistance: 10,
        reverseData: true,
        axisX: {
          showGrid: false,
          showLabel: false
        },
        axisY: {
          offset: 70
        }
      }
    }
  },
  methods: {
    download (name, data) {
      var extension = name.split('.')[1]
      var mimetype = {
        mid: 'audio/midi',
        ly: 'text/x-lilypond'
      }[extension]
      download(data, name, mimetype)
    },
    loadExample (url) {
      var self = this
      this.$http.get(url, {responseType: 'blob'}).then(function (response) {
        self.parseMidi({
          raw: response.bodyBlob,
          name: url.split('/').slice(-1)[0]
        })
      })
    },
    parseMidi (evt) {
      var reader = new FileReader()
      var self = this
      reader.onload = function (e) {
        self.midiData = MidiConvert.parse(e.target.result)
      }
      this.midiName = evt.name.split('.')[0]
      reader.readAsBinaryString(evt.raw)
    },
    detectScale (noteNames) {
      var counter = {}
      Detect.scale(noteNames).map(function (scale) {
        if (!counter[scale]) counter[scale] = 0
        counter[scale]++
      })
      var scaleData = {
        labels: [],
        series: [[]]
      }
      Object.keys(counter).map(function (i) {
        return [i, counter[i]]
      }).sort(function (a, b) {
        return b[1] - a[1]
      }).map(function (arr) {
        scaleData.labels.push(arr[0])
        scaleData.series[0].push(arr[1])
      })
      this.scalePlotData = scaleData
      this.selectedScale = scaleData.labels[0].replace('chromatic', 'major')
    },
    processMIDI () {
      var self = this
      var notes = []
      var periodTimes = []
      var noteNames = []
      var minTime = 10000
      self.midiData.tracks.map(function (track) {
        track.notes.map(function (n) {
          if ((n.time < self.segment[0]) || (n.time > self.segment[1])) return
          if (n.time < minTime) {
            minTime = n.time
          }
          periodTimes.push(2 * Math.PI * n.time)
          notes.push(Object.assign({}, n))
          noteNames.push(n.name)
        })
      })
      notes.map(function (n) { n.time = n.time - minTime })
      this.notes = notes
      this.tempo = null
      this.separateHands()
      this.findTempo(periodTimes)
      this.detectScale(noteNames)
    },
    findTempo (periodTimes) {
      function spectrum (tempo) {
        var quarterDuration = 60.0 / tempo
        var sinSum = 0
        var cosSum = 0
        periodTimes.map(function (t) {
          var tt = t / quarterDuration
          sinSum += Math.sin(tt)
          cosSum += Math.cos(tt)
        })
        return sinSum * sinSum + cosSum * cosSum
      }
      var spectrumData = {
        labels: [],
        series: [[]]
      }
      var bestTempo = 0
      var bestScore = 0
      for (var tempo = 40; tempo <= 250; tempo += 1) {
        spectrumData.labels.push(tempo)
        var score = spectrum(tempo)
        spectrumData.series[0].push(score)
        if (score > bestScore) {
          bestScore = score
          bestTempo = tempo
        }
      }
      this.tempo = bestTempo
      this.tempoPlotData = spectrumData
    },
    separateHands () {
      var self = this
      var hands = {
        left: [],
        right: []
      }
      self.notes.map(function (n) {
        var note = Object.assign({}, n)
        if (n.midi > self.separationNote) {
          hands.right.push(note)
        } else {
          hands.left.push(note)
        }
      })
      this.hands = hands
    },
    quantize (notes) {
      var quarterDuration = 60.0 / this.tempo
      var result = [
        {
          notes: [],
          duration: null,
          t: 0
        }
      ]
      notes.map(function (note) {
        var latest = result[result.length - 1]
        var delay = note.time - latest.t
        var delayQ = 0.5 * Math.floor((4.0 * (delay / quarterDuration) + 1) / 2)
        delayQ = Math.min(delayQ, 12)
        if (delayQ === 0) {
          if (latest.notes.indexOf(note) < 0) {
            latest.notes.push(note)
          }
        } else {
          latest.duration = delayQ
          result.push({
            notes: [note],
            duration: null,
            t: note.time
          })
        }
      })
      result[result.length - 1].duration = 4
      if (result[0].notes.length === 0) {
        result.shift()
      }
      return result
    },
    quantizeHands () {
      this.quantizedHands = {
        left: this.quantize(this.hands.left),
        right: this.quantize(this.hands.right)
      }
    },
    quantizedToMidi (quantizedNotes) {
      var intTempo = this.tempo.toFixed()
      var quarterDuration = 60.0 / intTempo
      var midi = MidiConvert.create()
      var track = midi.track().patch(0)
      var currentTime = 0
      quantizedNotes.map(function (noteGroup) {
        var duration = quarterDuration * noteGroup.duration
        noteGroup.notes.map(function (note) {
          track.note(note.midi, currentTime, duration)
        })
        currentTime += duration
      })
      midi.header.timeSignature = [4, 4]
      midi.header.bpm = intTempo
      return midi.encode()
    },
    handsToMidi () {
      this.handsMidi = {
        left: this.quantizedToMidi(this.quantizedHands.left),
        right: this.quantizedToMidi(this.quantizedHands.right)
      }
    },
    quantizedToLily (notes) {
      var lilynotes = ['c', 'cis', 'd', 'ees', 'e', 'f', 'fis', 'g', 'gis', 'a', 'bes', 'b']
      var lilyoctaves = [',,,,', ',,,', ',,', ',', '', '\'', '\'\'', '\'\'\'', '\'\'\'\'', '\'\'\'\'\'']
      var lilydurations = {0.5: '8', 1: '4', 1.5: '4.', 2: '2', 3: '2.', 4: '1', 6: '1.'}
      var lilyCompositeDurations = {
        2.5: [2, 0.5],
        3.5: [3, 0.5],
        4.5: [4, 0.5],
        5.5: [4, 1.5]
      }
      function midi2lily (note) {
        var octave = Math.floor(note / 12)
        var rank = note % 12
        return lilynotes[rank] + lilyoctaves[octave]
      }
      function noteGroup2lily (noteGroup) {
        var compositeDuration = lilyCompositeDurations[noteGroup.duration]
        if (compositeDuration) {
          return noteGroup2lily[compositeDuration[0]] + '~' + noteGroup2lily[compositeDuration[1]]
        }
        var duration = lilydurations[noteGroup.duration]
        var note
        if (noteGroup.notes.length > 1) {
          note = '< ' + noteGroup.notes.map(n => midi2lily(n.midi)).join(' ') + ' >'
        } else {
          note = midi2lily(noteGroup.notes[0].midi)
        }
        return note + duration
      }
      return notes.map(noteGroup2lily).join('\n')
    },
    handsToLily () {
      var left = this.quantizedToLily(this.quantizedHands.left)
      var right = this.quantizedToLily(this.quantizedHands.right)
      this.handsLily = lilyTemplate.replace('$CONTENT_LEFT_HAND', left).replace('$CONTENT_RIGHT_HAND', right)
    },
    seconds2minutes (s) {
      var mins = parseInt(s / 60)
      var secs = parseInt(s % 60)
      secs = secs > 10 ? secs : '0' + secs
      return mins + ':' + secs
    }
  },
  mounted () {
    var vf = new Vex.Flow.Factory({
      renderer: {elementId: 'staves', width: 500, height: 800}
    })

    var score = vf.EasyScore()
    var system = vf.System()
    var notes = score.notes('C#5/q, B4, A4, G#4, A4', {stem: 'up'})
    system.addStave({
      voices: [score.voice(notes)]
    }).addClef('treble').addTimeSignature('6/4')

    // system.addStave({
    //   voices: [
    //     score.voice(score.notes('C#5/q, B4, A4, G#4', {stem: 'up'})),
    //     score.voice(score.notes('C#4/h, C#4', {stem: 'down'}))
    //   ]
    // }).addClef('bass').addTimeSignature('4/4')

    vf.draw()
  },
  watch: {
    midiData () {
      this.processMIDI()
    },
    segment: {
      deep: true,
      handler () {
        this.processMIDI()
      }
    },
    tempo () {
      this.quantizeHands()
    },
    hands () {
      if (this.tempo) {
        this.quantizeHands()
      }
    },
    quantizedHands () {
      this.handsToMidi()
      this.handsToLily()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1 {
  font-size: 4em;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

.tempo-plot {
  margin: 0 auto;
  width: 600px;
  height: 200px;
}

.scale-plot {
  margin: 0 auto;
  width: 600px;
  height: 200px;
}

</style>

<style>
.ct-label.ct-label.ct-horizontal {
  position: fixed;
  justify-content: flex-end;
  text-align: right;
  transform-origin: 100% 0;
  transform: translate(-100%) rotate(-60deg);
}
.ct-series-a path, .ct-series-a .ct-bar {
  stroke: #88b1da !important;
}
</style>
