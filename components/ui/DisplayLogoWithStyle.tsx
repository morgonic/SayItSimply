import { styles } from "@/constants/styles";
import { Image, View } from 'react-native';

export default function DisplayLogoWithStyle() {
    return (
        <View style={styles.logoContainer}>
            <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                alt="App Logo"
            />
        </View>    
    )
}