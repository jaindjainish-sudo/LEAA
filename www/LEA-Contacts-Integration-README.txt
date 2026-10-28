LEA Contacts + Dialer update

FILES
- index.html, layoutOfLEA.css, layoutOfLEA.js: replace matching files inside your repository's www/ folder.
- PhoneContactsPlugin.java: native Android plugin source; it must be included in the generated Android project by the GitHub Actions workflow.

IMPORTANT: The HTML/CSS/JS dialer works as UI, but automatic phone contact import works only after this native plugin is added to the APK build and registered. This source assumes your Android package is com.lea.emergency.

NATIVE INTEGRATION
1. Commit `PhoneContactsPlugin.java` to your repository root. In the GitHub Actions workflow, after `npx cap add android` and `npx cap sync android`, add a step to copy it into the generated Android project:
   `mkdir -p android/app/src/main/java/com/lea/emergency`
   `cp PhoneContactsPlugin.java android/app/src/main/java/com/lea/emergency/PhoneContactsPlugin.java`
2. In `android/app/src/main/java/com/lea/emergency/MainActivity.java`, register the plugin in onCreate:

   import com.lea.emergency.PhoneContactsPlugin;
   import com.getcapacitor.BridgeActivity;

   public class MainActivity extends BridgeActivity {
       @Override
       public void onCreate(android.os.Bundle savedInstanceState) {
           registerPlugin(PhoneContactsPlugin.class);
           super.onCreate(savedInstanceState);
       }
   }

   If MainActivity already registers DirectCallPlugin, KEEP that registration too and add `registerPlugin(PhoneContactsPlugin.class);` alongside it.
3. Add `android.permission.READ_CONTACTS` to `android/app/src/main/AndroidManifest.xml`, inside `<manifest>` and outside `<application>`. Because the workflow generates Android fresh, make this a workflow step after `npx cap add android` and before Gradle build, rather than a one-time edit to the generated file.
4. Run the GitHub Actions workflow again and install the newly built APK. On first opening Contacts, allow contact access.

Do not test-call 112. The dialer only calls the number the user enters/selects; your existing SOS function remains unchanged.
