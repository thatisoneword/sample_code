
// I like to use object literal notation when writing JavaScript.
// This namespaces my variable and avoids collisions while
// helping to organize the structure of my code.
var address = {
    error_message: "",
    required_star: "<span class='required'>*</span> ",
    save_address: {},  //Used to hold each address before putting it in the array
    address_array: [], //All the addressed that have been validated
    unique_address: true,

    init: function() {
        address.error_box = $("#error_box");
        address.add_listeners();
    },

    add_listeners: function(){
        $("#address_form").submit(function(e){
            e.preventDefault();

            //remove error classes, messages and hide error box
            $("#address_form input, #address_form select").removeClass("error");
            address.error_message = "";
            address.error_box.hide();

            $("#add_address_btn").attr("disabled", "disabled");
            address.validate();
        });
    },

    validate: function(){
        //In each of these validations we get the form fields by class name and test them against
        //a regular expression. If the test fails we concatenate a warning message in the error_messase variable.
        //I like this method of validation because it is reusable and could potentially be used on
        //multiple fields of the same type at one time.
        //House number
        $(".validate_house_number").each(function(ind, obj){
            var houseAddressReg = new RegExp(/^[\d]+$/);  //Only numbers allowed here
            address.save_address.houseAddress = $.trim($(this).val());  //Set value and trim white space
            if ( !houseAddressReg.test(address.save_address.houseAddress) ){  //test the regEx against the value
                $(this).addClass("error");                //add error class to input
                //add error message to variable
                address.error_message += address.required_star + "House address must be only numbers.<br>";
            }
        });

        //Street
        $(".validate_street").each(function(ind, obj){
            var streetReg = new RegExp(/^[a-z\s\d]+$/i); //numbers, letters, spaces and case insensitive
            address.save_address.street = $.trim($(this).val());
            if ( !streetReg.test(address.save_address.street) ){
                $(this).addClass("error");
                address.error_message += address.required_star + "Street must only contain letters, numbers, and spaces.<br>";
            }
        });

        //Unit
        $(".validate_unit").each(function(ind, obj){ //not really a validation but I still want to get the value
            address.save_address.unit = $.trim($(this).val());
        });

        //City
        $(".validate_city").each(function(i, obj){
            var cityReg = new RegExp(/^[a-z\s\d]+$/i);
            address.save_address.city = $.trim($(this).val());
            if ( !cityReg.test(address.save_address.city) ){
                $(this).addClass("error");
                address.error_message += address.required_star + "City must only contain letters, numbers, and spaces.<br>";
            }
        });

        //State
        $(".validate_state").each(function(ind, obj){
            address.save_address.state = $(this).val()
            if ( address.save_address.state == "" ){ // Just make sure they selected something
                $(this).addClass("error");
                address.error_message += address.required_star + "You must select a state.<br>";
            }
        });

        //Zip Code
        $(".validate_zip").each(function(ind, obj){
            var zipReg = new RegExp(/(^\d{5}$)|(^\d{5}-\d{4}$)/); //two different patters for the zip code
            address.save_address.zip = $.trim($(this).val());
            if ( !zipReg.test(address.save_address.zip) ){
                $(this).addClass("error");
                address.error_message += address.required_star + "Zip code must follow this example: 94121 or 94121-1211.<br>";
            }
        });

        // If there is any thing in the error_message variable we need to show it so it can be corrected.
        if (address.error_message != ""){
            var error_label = "<div id='error_label' class='error_text'>Please fix the errors listed below</div>";
            address.error_box.html(error_label + address.error_message).show();
            $("#status_message").html("");
        } else {
        // save the address to the array but if there are already addresses saved we want
        // to test to see if it is a duplicate address
            if (address.address_array.length < 1) {
                // If this is the first address entered
                address.status_message("unique");
            } else {
                // We will check it if is a unique address
                address.check_uniqueness();
                if (address.unique_address) {
                    address.status_message("unique");
                } else {
                    address.status_message("duplicate");
                }
            }
        }
        $("#add_address_btn").removeAttr("disabled"); //re-enable the submit button
    },

    check_uniqueness: function() {
        // This is a simple way to compare objects there may be other ways depending on why you are comparing them.
        for (var i=0; i<address.address_array.length; i++) {
            if (JSON.stringify(address.save_address) == JSON.stringify(address.address_array[i]) ) {
                // if the strings are different we know it is not a unique address
                address.unique_address = false;
                return;
            }
        }
    },

    status_message: function(status) {
        if (status == "duplicate") {
            $("#status_message").html("<span class='error_text'>This address has already been entered.</span>")
        } else {
            $("#status_message").html("Your address has been saved.")
            address.address_array.push(address.save_address); //Save the address to the array
            address.show_address();
        }
        address.unique_address = true;
    },

    show_address: function() {
        var this_address = "<div class='saved_address fl'>" + address.save_address.houseAddress + " " +
            address.save_address.street + " " + address.save_address.unit + "<br>" + address.save_address.city +
            " " + address.save_address.state + " " + address.save_address.zip + "</div>";
            $("#saved").append(this_address);
        address.save_address = {}; // Empty the object

    }

} // end address