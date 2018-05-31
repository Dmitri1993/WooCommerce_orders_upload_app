// variables for global access in every function

var BASE_URL;
var key;
var password;
var encoded;
var AUTHORIZATION_TEMPLATE;

var customerRequest;
var ordersRequest;

var customerEmail;
var customerId;

var spinner;

// A function which makes a request to the WooCommerce service to fetch customer's data: id and Phone.

function customerReq(client) {

// Make a request using a site template for customers search and Email of ticket.

	  client.request.get(customerRequest + customerEmail, {
			headers: {
				Authorization: AUTHORIZATION_TEMPLATE
			}
		})
			.then(function(data) {
				var response = [];
				var responseParse = JSON.parse(data["response"]);

// If the request didn't bring any data, such Email is not associated with any customer at WooCommerce.

				if(!responseParse[0]) {
					client.interface.trigger('showNotify', { type: "warning", message: "Customer with this Email was not found !!!"});
					document.body.removeChild(spinner);
					return;
				}
				customerId = responseParse[0]["id"];

// Invoke a function that makes a request to fetch orders, made by customer with Email denoted in the ticket.

				ordersReq(responseParse);
			}, function(error) {
				console.log("Error Customer !!!: " + JSON.stringify(error));
			});
}

// A function which makes a request to the WooCommerce service to fetch customer's orders.

function ordersReq(responseParse) {

// Make a request using a site template for orders search and ID of the customer with Email denoted in the ticket.

	client.request.get(ordersRequest + customerId, {
		headers: {
			Authorization: AUTHORIZATION_TEMPLATE
		}
	})
		.then(function(data) {
		  var customersOrders = JSON.parse(data["response"]);

// Invoke a function to form Contact details (Email and Phone) tab. If the customer doesn't have any orders, it's the only tab to be formed.

          makeContactDetailsDiv(responseParse);

// Invoke a function to form Current order tab if the customer has at least 1 order. Else application turns off and spinner stops.

          if(customersOrders.length > 0) {
			  makeCurrentOrderDiv(customersOrders);

// Invoke a function to form Last 5 orders tab. Triggers if the received list of orders has	more than 1 item.

			  if (customersOrders.length > 1) {
				  makeOrdersList(customersOrders);
			  }
		  }

// If the received list of orders is empty, it's beenig shown a notification,

		  else {
			  client.interface.trigger('showNotify', { type: "info", message: "This customer does not have any orders !!!"});
		  }
		}, function(error) {
		console.log("Error Order !!!: " + JSON.stringify(error));
	});
}

// A function that forms Contact details tab (Email and Phone), adds it to html page and turnes off the spinner.

function makeContactDetailsDiv(responseParse) {
	var contactDiv = document.createElement('div');
	contactDiv.innerHTML =
		"<div class=\"fw-widget-wrapper\">\n" +
		"      <div><h4>Contact details</h4></div>\n" +
		"    <div class=\"fw-content-list\">\n" +
		"      <div class=\"muted\">Email:</div>\n" +
		"      <div>" + customerEmail + "</div>\n" +
		"      <div class=\"muted\">Phone:</div>\n" +
		"      <div>" + responseParse[0]["billing"]["phone"] + "</div>\n" +
		"      <div class=\"fw-divider\"></div>\n" +
		"      <div class=\"fw-divider\"></div>\n" +
		"    </div>\n" +
		"  </div>";
	document.body.removeChild(spinner);
	document.body.appendChild(contactDiv);

}

// A function that forms Current order tab and adds it to html page.

function makeCurrentOrderDiv(customersOrders) {
	var currentOrderDiv = document.createElement('div');
	currentOrderDiv.innerHTML =
		"<div class=\"fw-widget-wrapper\">\n" +
		"    <div><h4>Current order</h4></div>\n" +
		"    <div id=\"currentOrderListDiv\" class=\"fw-content-list\">\n" +
		"      <div class=\"muted\">Total value:</div>\n" +
		"      <div>" + customersOrders[0]["total"] + " " + customersOrders[0]["currency"] + "</div>\n" +
		"      <div class=\"muted\">Created Date:</div>\n" +
		"      <div>" + customersOrders[0]["date_created"].split("T")[0] + "</div>\n" +
		"      <div class=\"muted\">Status:</div>\n" +
		"      <div>" + customersOrders[0]["status"] + "</div>\n" +
		"      <div class=\"muted\">Shipping address:</div>\n" +
		"      <div>" + customersOrders[0]["shipping"]["address_1"] + ", " + customersOrders[0]["shipping"]["city"] + "</div>\n" +
		"      <div id=\"firstDivider\" class=\"fw-divider\"></div>\n" +
		"      <div class=\"fw-divider\"></div>\n" +
		"    </div>\n" +
		"  </div>";
	document.body.appendChild(currentOrderDiv);

	if(customersOrders[0]["customer_ip_address"]) {
		var div = document.createElement('div');
		div.innerHTML =
			"      <div class=\"muted\">Customer's IP:</div>\n" +
			"      <div>" + customerIP + "</div>\n";
		currentOrderListDiv.insertBefore(div, firstDivider);
	}
}

// A function that forms Last 5 orders tab and adds it to html page.

function makeOrdersList(customersOrders) {
	var div = document.createElement('div');
	var html = " <div class=\"fw-widget-wrapper\">\n" +
		"    <div><h4>Last orders</h4></div>\n" +
		"    <div class=\"fw-content-list\">\n";
	for(var i = 1; i < 6 && i < customersOrders.length; i++) {
			orderStatus = customersOrders[i]["status"];
			orderValue = customersOrders[i]["total"] + " " + customersOrders[i]["currency"];
			orderDate = customersOrders[i]["date_created"].split("T")[0];

			html = html +
				"      <div><h6>Order N " + customersOrders[i]["id"] + "</h6></div>\n" +
				"      <div class=\"muted\">Total value:</div>\n" +
				"      <div>" + orderValue + "</div>\n" +
				"      <div class=\"muted\">Created Date:</div>\n" +
				"      <div>" + orderDate +"</div>\n" +
				"      <div class=\"muted\">Status:</div>\n" +
				"      <div>" + orderStatus + "</div>\n" +
				"      <div class=\"fw-divider\"></div>\n" +
				"    </div>";
		}
	div.innerHTML = html;
	document.body.appendChild(div);
}

// Initializing the application.

$(document).ready( function() {
  app.initialized()
  .then(function(_client) {
    window.client = _client;

// When the application is initialized, occuring fetching data to assign domain, user name and password to access WooCommerce site.

	  client.iparams.get()
		  .then(function(data) {
			  BASE_URL = "https://" + data.subdomain;
			  key = data.username;
			  password = data.password;

// Starting spinner which stops when the process of fetching data from service is finished.

			  client.instance.resize({ height: "500px" });
			  spinner = document.createElement('div');
			  spinner.innerHTML = "<div id=\"spinner\" class=\"loader\"></div>";
			  document.body.appendChild(spinner);

		  })
		  .then(function() {
		  	client.data.get("contact")
				  .then(function(data) {

// Customize templates of request for customers and orders. Forming header to access the service.

					  customerRequest = BASE_URL + "/wp-json/wc/v2/customers?email=";
					  ordersRequest = BASE_URL + "/wp-json/wc/v2/orders?customer=";
					  encoded = window.btoa(key + ":" + password);
					  AUTHORIZATION_TEMPLATE = "Basic " + encoded;

// Assign Email varialble which will be used in receiving date from the WooCommerce service.

					  customerEmail = data.contact.email;

// Invoke function customerReq which make a request to fetch customer's data.

					  customerReq(window.client);
				  });
		  });
  });

});
