package com.lea.emergency;

import android.Manifest;
import android.database.Cursor;
import android.provider.ContactsContract;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.Permission;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

@CapacitorPlugin(
    name = "PhoneContacts",
    permissions = {
        @Permission(
            alias = "contacts",
            strings = { Manifest.permission.READ_CONTACTS }
        )
    }
)
public class PhoneContactsPlugin extends Plugin {

    @PluginMethod
    public void getContacts(PluginCall call) {
        if (getPermissionState("contacts") !=
                com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias(
                "contacts",
                call,
                "contactsPermissionCallback"
            );
            return;
        }

        readContacts(call);
    }

    @PermissionCallback
    private void contactsPermissionCallback(PluginCall call) {
        if (getPermissionState("contacts") ==
                com.getcapacitor.PermissionState.GRANTED) {
            readContacts(call);
        } else {
            call.reject("Contacts permission was denied");
        }
    }

    private void readContacts(PluginCall call) {
        JSArray results = new JSArray();

        String[] projection = {
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        };

        try (Cursor cursor = getContext().getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                projection,
                null,
                null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME
        )) {
            if (cursor != null) {
                int nameIndex = cursor.getColumnIndex(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME
                );
                int phoneIndex = cursor.getColumnIndex(
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                );

                while (cursor.moveToNext()) {
                    JSObject item = new JSObject();
                    item.put("name", cursor.getString(nameIndex));
                    item.put("phone", cursor.getString(phoneIndex));
                    results.put(item);
                }
            }

            JSObject response = new JSObject();
            response.put("contacts", results);
            call.resolve(response);

        } catch (Exception error) {
            call.reject("Unable to read phone contacts", error);
        }
    }
}
