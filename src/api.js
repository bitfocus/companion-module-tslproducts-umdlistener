const { InstanceStatus } = require('@companion-module/base')

const dgram = require('dgram')
const net = require('net')

module.exports = {
	openPort() {
		let self = this

		const portType = self.config.porttype

		self.updateStatus(InstanceStatus.Connecting)

		this.closePort()

		switch (portType) {
			case 'udp':
				startUDP.call(self)
				break
			case 'tcp':
				startTCP.call(self)
				break
			default:
				self.log('error', 'Invalid port type specified. Please choose either UDP or TCP.')
				break
		}

		self.oldPortType = portType
	},

	closePort() {
		let self = this

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

function startUDP() {
	let self = this

	let port = self.config.port

	self.log('info', `Creating UDP Connection on Port: ${port}`)
	self.SERVER = dgram.createSocket('udp4')
	self.SERVER.bind(port)
	self.updateStatus(InstanceStatus.Ok)

	self.SERVER.on('message', function (message, rinfo) {
		self.log('debug', `Received data: ${message.toString('hex')}`)

		if (self.config.protocol == 'tsl3.1') {
			parseTSL31Packet.bind(self)(message)
		} else if (self.config.protocol == 'tsl5.0') {
			parseTSL5Packet.bind(self)(message)
		}
	})
}

function startTCP() {
	let self = this

	let port = self.config.port

	try {
		self.log('info', `Creating TCP Connection on Port: ${port}`)
		self.SERVER = net
			.createServer(function (socket) {
				socket.on('data', function (data) {
					self.log('debug', `Received data: ${data.toString('hex')}`)

					if (self.config.protocol == 'tsl3.1') {
						parseTSL31Packet.bind(self)(data)
					} else if (self.config.protocol == 'tsl5.0') {
						parseTSL5Packet.bind(self)(data)
					}
				})

				socket.on('close', function () {
					self.log('debug', `TSL TCP Server connection closed.`)
				})

				self.log('debug', `TSL TCP Server connection opened.`)
				self.updateStatus(InstanceStatus.Ok)
			})
			.listen(port, function () {
				self.log('info', `TSL TCP Server started. Listening for data on Port: ${port}`)
			})
	} catch (error) {
		self.log('error', `TSL TCP Server Error occurred: ${error}`)
		self.setVariableValues({ module_state: 'Error - See Log.' })
	}
}

function parseTSL31Packet(buffer) {
	let self = this

	if (buffer.length < 18) return null

	const address = buffer.readUInt8(0)

	const tallyByte = buffer.readUInt8(1)
	const brightness = (tallyByte >> 6) & 0b11
	const tally4 = (tallyByte >> 5) & 0b1
	const tally3 = (tallyByte >> 4) & 0b1
	const tally2 = (tallyByte >> 3) & 0b1
	const tally1 = (tallyByte >> 2) & 0b1

	let label = buffer.slice(2, 18).toString('ascii').replace(/\0/g, '').trim()

	processTSLTallyObj({
		address: address,
		tally1: tally1,
		tally2: tally2,
		tally3: tally3,
		tally4: tally4,
		brightness: brightness,
		label: label,
	})
}

function processTSLTallyObj(tally) {
	let self = this

	let found = false

	self.TALLIES = self.TALLIES || []
	self.CHOICES_TALLYADDRESSES = self.CHOICES_TALLYADDRESSES || []

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

		if (self.config.protocol == 'tsl5.0') {
			tallyObj.rh_tally = tally.rh_tally
			tallyObj.text_tally = tally.text_tally
			tallyObj.lh_tally = tally.lh_tally
			tallyObj.brightness = tally.brightness
			tallyObj.reserved = tally.reserved
			tallyObj.control_data = tally.control_data
		}

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

function parseTSL5Packet(data) {
	if (data.length < 12) return

	const PBC = data.readUInt16LE(0)
	const VAR = data.readUInt8(2)
	const FLAGS = data.readUInt8(3)
	const SCREEN = data.readUInt16LE(4)
	const INDEX = data.readUInt16LE(6)
	const CONTROL = data.readUInt16LE(8)
	const LENGTH = data.readUInt16LE(10)

	if (data.length < 12 + LENGTH) return

	const TEXT = data
		.slice(12, 12 + LENGTH)
		.toString('ascii')
		.replace(/\0/g, '')
		.trim()

	const control = {
		rh_tally: (CONTROL >> 0) & 0b11,
		text_tally: (CONTROL >> 2) & 0b11,
		lh_tally: (CONTROL >> 4) & 0b11,
		brightness: (CONTROL >> 6) & 0b11,
		reserved: (CONTROL >> 8) & 0b1111111,
		control_data: (CONTROL >> 15) & 0b1,
	}

	let inPreview = 0
	let inProgram = 0

	switch (control.text_tally) {
		case 1:
			inProgram = 1
			break
		case 2:
			inPreview = 1
			break
		case 3:
			inProgram = 1
			inPreview = 1
			break
	}

	const newTallyObj = {
		tally1: inPreview,
		tally2: inProgram,
		address: INDEX,
		label: TEXT,
		rh_tally: control.rh_tally,
		text_tally: control.text_tally,
		lh_tally: control.lh_tally,
		brightness: control.brightness,
		reserved: control.reserved,
		control_data: control.control_data,
	}

	processTSLTallyObj.call(this, newTallyObj)
}
