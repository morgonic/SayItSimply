import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 24
    },
    logo: {
        width: 160,
        height: 160, 
        resizeMode: 'contain',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 24
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 40
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E6E6E6'
    },
    separatorText: {
        marginHorizontal: 8,
        color: '#828282',
        fontSize: 14
    }
});