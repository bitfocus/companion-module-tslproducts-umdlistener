var InstanceSkel = require('../../instance_skel');

const configFields = require('./src/configFields');
const api = require('./src/api');
const actions = require('./src/actions');
const variables = require('./src/variables');
const feedbacks = require('./src/feedbacks');
const presets = require('./src/presets');

class TSLProductsUMDListenerInstance extends InstanceSkel {
	constructor(system, id, config) {
		super(system, id, config)

		this.config = config

		this.oldPortType = '';

		this.SERVER = null;
		this.TALLIES = [];
		this.CHOICES_TALLYADDRESSES = [
			{ id: -1, label: 'No tally data received yet...'}
		]

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...configFields,
			...api,
			...actions,
			...variables,
			...feedbacks,
			...presets,			
		})
	}

	init() {
		this.status(this.STATUS_UNKNOWN);

		// Update the config
		this.updateConfig();
	}

	updateConfig(config) {
		if (config) {
			this.oldPortType = this.config.porttype;
			this.config = config
		}

		if (this.SERVER) {
			//close out any open ports and re-init
			this.closePort();
		}

		// Quickly check if certain config values are present and continue setup
		if (this.config.port) {
			//Open the listening port
			this.openPort();

			// Init the Actions
			this.actions();

			// Init and Update Variables
			this.updateVariableDefinitions();
			this.checkVariables();

			// Init the Feedbacks
			this.feedbacks();

			// Init the Presets
			this.presets();

			// Set Status to Connecting
			this.status(this.STATUS_CONNECTING)

			this.setVariable('module_state', 'Waiting for Data...');
		}
	}

	destroy() {
		//close out any TCP or UDP connections
		this.closePort();

		this.debug('destroy', this.id);
	}
}

module.exports = TSLProductsUMDListenerInstance;