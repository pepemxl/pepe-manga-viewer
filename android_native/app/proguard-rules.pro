# kotlinx.serialization — keep generated serializers
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class **$$serializer { *; }
-keepclasseswithmembers class read.pepe.manga.data.remote.dto.** { *; }

# junrar (CBR/RAR extraction) pulls in slf4j-api but no binding is shipped, so
# the optional StaticLoggerBinder is absent at compile time — silence R8.
-dontwarn org.slf4j.**
