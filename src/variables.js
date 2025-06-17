module.exports = {
	initVariables() {
		let self = this

		let variables = [{ name: 'Module State', variableId: 'module_state' }]

		for (let i = 0; i < self.TALLIES.length; i++) {
			variables.push({
				name: `Tally ${self.TALLIES[i].address} Label`,
				variableId: `tally_${self.TALLIES[i].address}_label`,
			})
			variables.push({
				name: `Tally ${self.TALLIES[i].address} PVW`,
				variableId: `tally_${self.TALLIES[i].address}_pvw`,
			})
			variables.push({
				name: `Tally ${self.TALLIES[i].address} PGM`,
				variableId: `tally_${self.TALLIES[i].address}_pgm`,
			})

			if (self.config.protocol == 'tsl5.0') {
				variables.push({
					name: `Tally ${self.TALLIES[i].address} RH Tally`,
					variableId: `tally_${self.TALLIES[i].address}_rh_tally`,
				})
				variables.push({
					name: `Tally ${self.TALLIES[i].address} Text Tally`,
					variableId: `tally_${self.TALLIES[i].address}_text_tally`,
				})
				variables.push({
					name: `Tally ${self.TALLIES[i].address} LH Tally`,
					variableId: `tally_${self.TALLIES[i].address}_lh_tally`,
				})
				variables.push({
					name: `Tally ${self.TALLIES[i].address} Brightness`,
					variableId: `tally_${self.TALLIES[i].address}_brightness`,
				})
				variables.push({
					name: `Tally ${self.TALLIES[i].address} Reserved`,
					variableId: `tally_${self.TALLIES[i].address}_reserved`,
				})
				variables.push({
					name: `Tally ${self.TALLIES[i].address} Control Data`,
					variableId: `tally_${self.TALLIES[i].address}_control_data`,
				})
			}
		}

		self.setVariableDefinitions(variables)
	},

	checkVariables() {
		let self = this

		try {
			let variableObj = {}

			for (let i = 0; i < self.TALLIES.length; i++) {
				variableObj[`tally_${self.TALLIES[i].address}_label`] = self.TALLIES[i].label
				variableObj[`tally_${self.TALLIES[i].address}_pvw`] = self.TALLIES[i].tally1 == 1 ? 'True' : 'False'
				variableObj[`tally_${self.TALLIES[i].address}_pgm`] = self.TALLIES[i].tally2 == 1 ? 'True' : 'False'

				if (self.config.protocol == 'tsl5.0') {
					variableObj[`tally_${self.TALLIES[i].address}_rh_tally`] = self.TALLIES[i].rh_tally
					variableObj[`tally_${self.TALLIES[i].address}_text_tally`] = self.TALLIES[i].text_tally
					variableObj[`tally_${self.TALLIES[i].address}_lh_tally`] = self.TALLIES[i].lh_tally
					variableObj[`tally_${self.TALLIES[i].address}_brightness`] = self.TALLIES[i].brightness
					variableObj[`tally_${self.TALLIES[i].address}_reserved`] = self.TALLIES[i].reserved
					variableObj[`tally_${self.TALLIES[i].address}_control_data`] = self.TALLIES[i].control_data
				}
			}

			self.setVariableValues(variableObj)
		} catch (error) {
			//do something with that error
			if (self.config.verbose) {
				self.log('debug', 'Error Updating Variables: ' + error)
			}
		}
	},
}
