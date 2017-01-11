import View from 'view';
import Storage from 'storage';

const MAX_HEIGHT = 350;
const WIDTH = 500;

class Modal {
	constructor(client, data) {
		this.client = client;
		this._metadata = data.metadata;
		this._context = data.context;
		this.ticket_id = this.getQueryValueByKey('ticket_id');

		this.storage = new Storage(this._metadata.installationId);
		this.view = new View({ afterRender: () => {
			let newHeight = Math.min($('html').height(), MAX_HEIGHT);
			this.client.invoke('resize', { height: newHeight, width: WIDTH });
		}});

		this.view.switchTo('loading');

		this.getTicket().then(this.renderTicketPreview.bind(this));
	}

	renderTicketPreview(data) {
		let template_data = {
			id: data.ticket.id,
			type: data.ticket.type,
			description: data.ticket.description.replace(/(?:\r\n|\r|\n)/g, '<br />')
		};
	
		this.view.switchTo('ticket_preview', template_data);
		this.attachEvents();
	}

	attachEvents() {
		$('#open-ticket').click((e) => {
			this.client.invoke('routeTo', 'ticket', this.ticket_id);
			this.client.invoke('destroy');
		});
	}

	getTicket() {
		return this.client.request({ url: `/api/v2/tickets/${this.ticket_id}.json` });
	}

	parseQuery() {
		let data = [];
		let search = window.location.search;
		let queryStr = search.split('?')[1];
		let pairs = queryStr.split('&');

		for (let i = 0, len = pairs.length; i < len; i++) {
			data.push({
				key: pairs[i].split('=')[0],
				value: pairs[i].split('=')[1]
			});
		}

		return data;
	}

	getQueryValueByKey(key) {
		let data = this.parseQuery();

		for (let i = 0, len = data.length; i < len; i++) {
			if (data[i].key === key) {
				return data[i].value;
			} 
		}
	}
}

export default Modal;