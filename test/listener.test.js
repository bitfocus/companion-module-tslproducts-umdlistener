const { test } = require('node:test')
const assert = require('node:assert/strict')
const dgram = require('node:dgram')
const net = require('node:net')
const { once } = require('node:events')
const { setTimeout: delay } = require('node:timers/promises')
const api = require('../src/api')
const feedbacks = require('../src/feedbacks')
const variables = require('../src/variables')

function instance(porttype, protocol) {
	return {
		...api,
		...feedbacks,
		...variables,
		config: { port: 0, porttype, protocol, filter: ' (FSFC)' },
		oldPortType: '',
		TALLIES: [],
		CHOICES_TALLYADDRESSES: [{ id: -1, label: 'No tally data received yet...' }],
		values: {},
		log() {},
		updateStatus() {},
		checkFeedbacks() {},
		setVariableValues(values) {
			Object.assign(this.values, values)
		},
		setVariableDefinitions(definitions) {
			this.definitions = definitions
		},
		setFeedbackDefinitions(definitions) {
			this.feedbacks = definitions
		},
	}
}

function packet31(address, bits, label) {
	const packet = Buffer.alloc(18)
	packet[0] = 0x80 + address
	packet[1] = bits
	packet.write(label, 2, 16, 'ascii')
	return packet
}

function packet5(address, control, label) {
	const text = Buffer.from(label)
	const packet = Buffer.alloc(12 + text.length)
	packet.writeUInt16LE(packet.length - 2)
	packet.writeUInt16LE(address, 6)
	packet.writeUInt16LE(control, 8)
	packet.writeUInt16LE(text.length, 10)
	text.copy(packet, 12)
	return packet
}

async function waitFor(predicate) {
	for (let i = 0; i < 100; i++) {
		if (predicate()) return
		await delay(10)
	}
	assert.fail('Timed out waiting for listener output')
}

for (const transport of ['udp', 'tcp']) {
	for (const protocol of ['tsl3.1', 'tsl5.0']) {
		test(`${transport} ${protocol}: inbound packets, updates, variables and feedback IDs`, async (t) => {
			const self = instance(transport, protocol)
			self.openPort()
			const server = self.SERVER
			await once(server, 'listening')
			const port = server.address().port
			const client = transport === 'udp' ? dgram.createSocket('udp4') : net.connect(port, '127.0.0.1')
			if (transport === 'tcp') await once(client, 'connect')
			t.after(async () => {
				if (transport === 'udp') {
					client.close()
					self.closePort()
				} else {
					client.destroy()
					// Stable closePort does not close a net.Server. Explicit fixture cleanup.
					await new Promise((resolve) => server.close(resolve))
				}
			})
			const send = (packet) => (transport === 'udp' ? client.send(packet, port, '127.0.0.1') : client.write(packet))
			const make = protocol === 'tsl3.1' ? packet31 : packet5
			send(Buffer.from([1, 2]))
			await delay(20)
			assert.equal(self.TALLIES.length, 0)
			let packet = make(7, protocol === 'tsl3.1' ? 0xc3 : 0xfe, 'CAM (FSFC)')
			if (protocol === 'tsl5.0') {
				// DLE/STX with byte stuffing, including CONTROL's 0xfe byte.
				packet = Buffer.from([0xfe, 2, ...Array.from(packet).flatMap((b) => (b === 0xfe ? [b, b] : [b]))])
			}
			send(packet)
			await waitFor(() => self.values.tally_7_label === 'CAM')
			assert.equal(self.values.tally_7_pvw, 'True')
			assert.equal(self.values.tally_7_pgm, 'True')
			assert.ok(self.definitions.some((d) => d.variableId === 'tally_7_label'))
			assert.deepEqual(Object.keys(self.feedbacks), ['tallyState'])
			assert.deepEqual(
				self.feedbacks.tallyState.options.map((o) => o.id),
				['address', 'number', 'state'],
			)
			assert.equal(self.feedbacks.tallyState.callback({ options: { address: 7, number: 'tally2', state: 1 } }), true)
			send(make(7, 0, 'OFF'))
			await waitFor(() => self.values.tally_7_label === 'OFF')
			assert.equal(self.TALLIES.length, 1)
			assert.equal(self.values.tally_7_pgm, 'False')
			assert.equal(self.feedbacks.tallyState.callback({ options: { address: 7, number: 'tally2', state: 1 } }), false)
		})
	}
}

test('UDP closes its port and can restart on the same port', async () => {
	const self = instance('udp', 'tsl3.1')
	self.openPort()
	const first = self.SERVER
	await once(first, 'listening')
	self.config.port = first.address().port
	self.closePort()
	await once(first, 'close')
	assert.equal(self.SERVER, undefined)
	self.openPort()
	const second = self.SERVER
	try {
		await once(second, 'listening')
		assert.equal(second.address().port, self.config.port)
	} finally {
		self.closePort()
	}
})
