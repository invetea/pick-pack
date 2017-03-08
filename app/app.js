(function() {

	var picklist = new Array();
	var packlist = new Array();
	var items2pick = 0;
	var products2pick = 0;
	var orders2pack = 0;
	var totalordervalue = 0;
	var pickContainer = $('.picklist');
	var packContainer = $('.packlist');
	var modals = $('.modal-notes');
	var store_dashboard_url = '';
	
	var sort_by = function(field, reverse, primer){

	   var key = primer ? 
		   function(x) {return primer(x[field])} : 
		   function(x) {return x[field]};

	   reverse = [-1, 1][+!!reverse];

	   return function (a, b) {
		   return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
		 } 
	};

	function appStart() {
		TT.native.loading();
		picklist = new Array();
		packlist = new Array();
		items2pick = 0;
		products2pick = 0;
		orders2pack = 0;
		totalordervalue = 0;
		$('.picklist').empty();
		$('.packlist').empty();
		TT.api.get('v1/me')
		  .done(TC_fetchOrders)
		  .fail(genericError);
	}

	function TC_fetchOrders(store) {
		store_dashboard_url = store.dashboard_url;
		TT.api.get('/v1/stores/' + store.id + '/orders?completed=false')
		  .done(TC_listOrders)
		  .fail(genericError);
	}

	function TC_listOrders(orders) {
		CreatePicklist(orders);
		CreatePacklist(orders);
		PopulatePicklist();
		if (items2pick > 0) { 
			$('.tablePick').removeClass('hidden');
		} else {
			$('.tablePick').addClass('hidden');
		}
		$(".items2pick").html(items2pick);
		$(".products2pick").html(products2pick);
		$('#tabPick').removeClass('hidden');
		PopulatePacklist();
		if (orders2pack > 0) { 
			$('.tablePack').removeClass('hidden');
		} else {
			$('.tablePack').addClass('hidden');
		}
		$('#tabPack').removeClass('hidden');
		$(".orders2pack").html(orders2pack);
		totalordervalueRounded = Math.round(totalordervalue);
		$(".totalordervalue").html(totalordervalueRounded);
		TT.native.loaded();
		TT.native.reportSize();
	}

	function CreatePicklist(orders) {
		for (var i = 0; i < orders.length; i++) {
			var order = orders[i];
			if(order.fullfilment.status == 'unhandled') {
				order.items.forEach(function(item, index2) {
					var variation = 'none';
					if (item.product.variation) { variation = item.product.variation.title;	}
					var id = item.product.title + '_' + variation;
					items2pick += item.quantity;
					var updateproduct = 0;
					for (var p in picklist) {
						if (picklist.hasOwnProperty(p)) {
							if (picklist[p].id == id) {
								updateproduct = 1;
								picklist[p].quantity += item.quantity;
							}
						}
					}
					if (!updateproduct) {
						products2pick++;
						var productimage = '';
						if (item.product.images[0]) {
							//productimage = item.product.images[0].sizes['40'];
							productimage = item.product.images[0].url;
						} else {
							productimage = './pick-pack-no-image-icon.png';
						}
						var instock = '0';
						if (item.product.variation) {
							if (item.product.variation.unlimited) {
								instock = 'unlimited';
							} else {
								instock = item.product.variation.quantity;
							}
						} else if (item.product.unlimited) {
							instock = 'unlimited';
						} else if (item.product.quantity) {
							instock =  item.product.quantity;
						}
						var pick = {
						   "id" : id,
						   "product" : item.product.title,
						   "price" : item.product.price / 100,
						   "quantity" : item.quantity,
						   "variation" : variation,
						   "image" : productimage,
						   "instock" : instock,
						   "slug" : item.product.slug
						};  
						picklist.push(pick);  
					}
				});
			}
		}
	}
		
	function PopulatePicklist() {
		picklist.sort(sort_by('product', true, function(a){return a.toUpperCase()}));
		for (var pick in picklist) {
			if (picklist.hasOwnProperty(pick)) {
				var variation = '';
				if (picklist[pick].variation != 'none') { variation = picklist[pick].variation;	}
				var producturl = store_dashboard_url + '/product/' + picklist[pick].slug;
				$('<tr><td><img src="' + picklist[pick].image + '?size=40"></td><td class="title"><a href="'+ producturl + '" target="_blank">' + picklist[pick].product + '</a></td><td>' + variation + '</td><td>' + picklist[pick].quantity + '</td><td>' + picklist[pick].instock + '</td></tr>').appendTo(pickContainer);
			}
		}
	}

	function CreatePacklist(orders) {
		for (var i = 0; i < orders.length; i++) {
			var order = orders[i];
			if(order.fullfilment.status == 'unhandled') {
				orders2pack++;
				totalordervalue += order.price / 100;
				var products = '';
				order.items.forEach(function(item2, index2) {
					if (products) {
						products = products + "</br>" + item2.quantity + " x " + item2.product.title
					} else {
						products = item2.quantity + " x " + item2.product.title
					};
					if (item2.product.variation) {
						products = products + " (" + item2.product.variation.title + ")"
					}
				});
				var notebtn = '';
				if (order.note) {
					$(".modal-" + order.number).empty();
					notebtn = '<button type="button" class="btn btn-default btn-sm" data-toggle="modal" data-target=".modal-' + order.number + '">Notes</button>';
					$('<div class="modal fade modal-' + order.number + '"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button><h4 class="modal-title">Notes from ' + order.fullfilment.receiver.name + '</h4></div><div class="modal-body"><pre>' + order.note + '</pre></div></div></div></div>').appendTo(modals);
				} 
				var pack = {
				   "ordernumber" : order.number,
				   "products" : products,
				   "receiver_name" : order.fullfilment.receiver.name,
				   "receiver_street" : order.fullfilment.receiver.street,
				   "receiver_street2" : order.fullfilment.receiver.street_line2,
				   "receiver_city" : order.fullfilment.receiver.city,
				   "receiver_zip" : order.fullfilment.receiver.zip,
				   "receiver_country" : order.fullfilment.receiver.country,
				   "orderdate" : order.created_at.substr(0,10),
				   "note" : notebtn,
				   "shippingmethod" : order.shipping_alternative.title
				};  
				packlist.push(pack);  
			}
		}
	}
		
	function PopulatePacklist() {
		packlist.sort(sort_by('orderdate', true, function(a){return a.toUpperCase()}));
		for (var pack in packlist) {
			if (packlist.hasOwnProperty(pack)) {
				var street = packlist[pack].receiver_street;
				if (packlist[pack].receiver_street2) {
					street = street + '</br>' + packlist[pack].receiver_street2;
				}
				var customer = '<b>' + packlist[pack].receiver_name + '</b></br>' + street + '</br>' + packlist[pack].receiver_country + '-' + packlist[pack].receiver_zip + ' ' + packlist[pack].receiver_city;
				var orderurl = store_dashboard_url + '/order/' + packlist[pack].ordernumber;
				$('<tr><td><a href="'+ orderurl + '" target="_blank">#' + packlist[pack].ordernumber + '</a></td><td nowrap>' + customer + '</td><td nowrap>' + packlist[pack].products + '</td><td nowrap>' + packlist[pack].orderdate + '</td><td>' + packlist[pack].shippingmethod + '</td><td>' + packlist[pack].note + '</td></tr>').appendTo(packContainer);
			}
		}
	}
	
	function genericError() {
		console.error('Something went wrong');
	}

	$(".picklink").click(function() {
		$('.packlink').removeClass('active');
		$('.picklink').addClass('active');
	});
		
	$(".packlink").click(function() {
		$('.picklink').removeClass('active');
		$('.packlink').addClass('active');
	});

	TT.native.init().done(appStart).fail(genericError);
	
})();
