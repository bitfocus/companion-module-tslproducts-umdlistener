const { InstanceStatus } = require('@companion-module/base')

const TSLUMD = require('tsl-umd') // TSL 3.1 UDP package
const TSLUMDv5 = require('tsl-umd-v5')
const net = require('net')
const packet = require('packet')

module.exports = {
	openPort() {
		let self = this // required to have reference to outer `this`

		const port = self.config.port
		const portType = self.config.porttype
		const protocol = self.config.protocol

		switch (protocol) {
			case 'tsl3.1':
				setupTSL31(self, port, portType)
				break
			case 'tsl4.0':
				break
			case 'tsl5.0':
				if (portType == 'udp') {
					SetUpTSL5Server_UDP(self, port)
				} else if (portType == 'tcp') {
					SetUpTSL5Server_TCP(self, port)
				}
				break
			default:
				break
		}

		self.oldPortType = portType
	},

	closePort() {
		let self = this // required to have reference to outer `this`

		let port = self.config.port
		let portType = self.oldPortType == '' ? self.config.porttype : self.oldPortType

		if (self.SERVER !== undefined) {
			try {
				switch (portType) {
					case 'udp':
						self.log('info', `Closing TSL UMD UDP Port.`)
						self.SERVER.close()
						break
					case 'tcp':
						self.log('info', `Closing TSL UMD TCP Port.`)
						if (self.SERVER.server !== undefined) {
							self.SERVER.server.close(function () {})
						}
						break
					default:
						break
				}

				self.SERVER = undefined
			} catch (error) {
				self.log('error', 'Error occurred closing Tally listener port: ' + error.toString())
				self.setVariableValues({ module_state: 'Error - See Log.' })
			}
		}
	},
}

function setupTSL31(self, port, portType) {
	try {
		if (portType == 'udp') {
			self.SERVER = new TSLUMD(port)
			self.log('info', `TSL 3.1 Server started. Listening for data on UDP Port: ${port}`)
			self.SERVER.on('message', function (tally) {
				processTSL31Tally.bind(self)(tally)
			})
		} else if (portType == 'tcp') {
			let parser = packet.createParser()
			parser.packet(
				'tsl',
				'b8{x1, b7 => address},b8{x2, b2 => brightness, b1 => tally4, b1 => tally3, b1 => tally2, b1 => tally1 }, b8[16] => label',
			)

			self.SERVER = net
				.createServer(function (socket) {
					socket.on('data', function (data) {
						parser.extract('tsl', function (result) {
							result.label = new Buffer.from(result.label).toString().trim()
							processTSL31Tally.bind(self)(result)
						})
						parser.parse(data)
					})

					socket.on('close', function () {
						self.log('debug', `TSL 3.1 TCP Server connection closed.`)
					})
				})
				.on('error', (err) => {
					let error = err.toString()

					Object.keys(err).forEach(function (key) {
						if (key === 'code') {
							if (err[key] === 'EADDRINUSE') {
								error = 'This port (' + port + ') is already in use. Choose another port.'
							}
						}
					})

					self.log('error', error)
				})
				.listen(port, function () {
					self.log('info', `TSL 3.1 Server started. Listening for data on TCP Port: ${port}`)
				})
		}
	} catch (error) {
		self.log('error', 'Error occurred setting up Tally Listener: ' + error.toString())
		self.setVariableValues({ module_state: 'Error - See Log.' })
	}
}

function processTSL31Tally(tally) {
	let self = this

	let found = false

	if (self.CHOICES_TALLYADDRESSES.length > 0 && self.CHOICES_TALLYADDRESSES[0].id == -1) {
		//if the choices list is still set to default, go ahead and reset it
		self.CHOICES_TALLYADDRESSES = []
	}

	for (let i = 0; i < self.TALLIES.length; i++) {
		if (self.TALLIES[i].address == tally.address) {
			self.TALLIES[i].tally1 = tally.tally1
			self.TALLIES[i].tally2 = tally.tally2
			self.TALLIES[i].label = tally.label.trim().replace(self.config.filter, '')

			found = true
			break
		}
	}

	if (!found) {
		let tallyObj = {}
		tallyObj.address = tally.address
		tallyObj.tally1 = tally.tally1
		tallyObj.tally2 = tally.tally2
		tallyObj.label = tally.label.trim().replace(self.config.filter, '')

		self.TALLIES.push(tallyObj)
		self.TALLIES.sort((a, b) => a.address - b.address)

		self.CHOICES_TALLYADDRESSES.push({
			id: tally.address,
			label: tally.address + ' (' + tally.label.trim().replace(self.config.filter, '') + ')',
		})

		self.CHOICES_TALLYADDRESSES.sort((a, b) => a.id - b.id)

		self.initVariables()
		self.initFeedbacks()
	}

	self.updateStatus(InstanceStatus.Ok)
	self.setVariableValues({ module_state: 'Tally Data Received.' })

	self.checkVariables()
	self.checkFeedbacks()
}

function SetUpTSL5Server_UDP(self, port) {
	try {
		self.log('info', `Creating TSL 5.0 UDP Connection on Port: ${port}`)
		self.SERVER = dgram.createSocket('udp4')
		self.SERVER.bind(port)

		self.SERVER.on('message', function (message, rinfo) {
			processTSL5Tally(message)
		})
	} catch (error) {
		self.log('error', `TSL 5.0 UDP Server Error occurred: ${error}`)
		self.setVariableValues({ module_state: 'Error - See Log.' })
	}
}

function SetUpTSL5Server_TCP(self, port) {
	try {
		self.log('info', `Creating TSL 5.0 TCP Connection on Port: ${port}`)
		self.SERVER = net
			.createServer(function (socket) {
				socket.on('data', function (data) {
					processTSL5Tally(data)
				})

				socket.on('close', function () {
					self.log('debug', `TSL 5.0 TCP Server connection closed.`)
				})
			})
			.listen(port, function () {
				self.log('info', `TSL 5.0 TCP Server started. Listening for data on Port: ${port}`)
			})
	} catch (error) {
		self.log('error', `TSL 5.0 TCP Server Error occurred: ${error}`)
		self.setVariableValues({ module_state: 'Error - See Log.' })
	}
}

function processTSL5Tally(data) {
	if (data.length > 12) {
		tallyobj = {}

		var cursor = 0

		//Message Format
		const _PBC = 2 //bytes
		const _VAR = 1
		const _FLAGS = 1
		const _SCREEN = 2
		const _INDEX = 2
		const _CONTROL = 2

		//Display Data
		const _LENGTH = 2

		tallyobj.PBC = jspack.Unpack('<H', data, cursor)
		cursor += _PBC

		tallyobj.VAR = jspack.Unpack('<B', data, cursor)
		cursor += _VAR

		tallyobj.FLAGS = jspack.Unpack('<B', data, cursor)
		cursor += _FLAGS

		tallyobj.SCREEN = jspack.Unpack('<H', data, cursor)
		cursor += _SCREEN

		tallyobj.INDEX = jspack.Unpack('<H', data, cursor)
		cursor += _INDEX

		tallyobj.CONTROL = jspack.Unpack('<H', data, cursor)
		cursor += _CONTROL

		tallyobj.control = {}
		tallyobj.control.rh_tally = (tallyobj.CONTROL >> 0) & 0b11
		tallyobj.control.text_tally = (tallyobj.CONTROL >> 2) & 0b11
		tallyobj.control.lh_tally = (tallyobj.CONTROL >> 4) & 0b11
		tallyobj.control.brightness = (tallyobj.CONTROL >> 6) & 0b11
		tallyobj.control.reserved = (tallyobj.CONTROL >> 8) & 0b1111111
		tallyobj.control.control_data = (tallyobj.CONTROL >> 15) & 0b1

		var LENGTH = jspack.Unpack('<H', data, cursor)
		cursor += _LENGTH

		tallyobj.TEXT = jspack.Unpack('s'.repeat(LENGTH), data, cursor)

		let inPreview = 0
		let inProgram = 0

		switch (tallyobj.control.text_tally) {
			case 0:
				inPreview = 0
				inProgram = 0
				break
			case 1:
				inPreview = 0
				inProgram = 1
				break
			case 2:
				inPreview = 1
				inProgram = 0
				break
			case 3:
				inPreview = 1
				inProgram = 1
				break
		}

		let newTallyObj = {}
		newTallyObj.tally1 = inPreview
		newTallyObj.tally2 = inProgram
		newTallyObj.address = tallyobj.INDEX[0]
		newTallyObj.label = tallyobj.TEXT.join('').trim()

		processTSL31Tally(newTallyObj) // Reuse the TSL 3.1 processing function to handle the TSL 5.0 data
	}
}
